const { Pool } = require('pg');
const { MongoClient, ServerApiVersion } = require('mongodb');
const moment = require('moment-timezone');
require('dotenv').config({ path: 'src/.env' });
const path = require('path');
const express = require('express');
const compression = require('compression');
const memjs = require('memjs');
const NodeCache = require('node-cache');
const cluster = require('cluster');
const os = require('os');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const formData = require('form-data');
const Mailgun = require('mailgun.js');

const app = express();
const cors = require('cors');
app.use(cors());
app.use(compression());
app.use(express.json());

const PORT = process.env.PORT || 3003;

// PostgreSQL configuration
const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    port: process.env.DB_PORT,
    ssl: { rejectUnauthorized: false },
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
};

const db = new Pool(dbConfig);

// MongoDB Atlas connection
const mongoUri = process.env.MONGO_URI; 
const mongoClient = new MongoClient(mongoUri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

let mongoDB;

async function connectToMongoDB() {
    try {
        await mongoClient.connect();
        mongoDB = mongoClient.db(process.env.MONGO_DB_NAME);  
        console.log("Connected to MongoDB Atlas.");
    } catch (error) {
        console.error("Failed to connect to MongoDB Atlas:", error);
    }
}

const memcachedClient = memjs.Client.create(process.env.MEMCACHED_SERVERS, {
    username: process.env.MEMCACHED_USERNAME,
    password: process.env.MEMCACHED_PASSWORD,
    timeout: 5000,
});

const localCache = new NodeCache({ stdTTL: 3600 });

async function connectToDatabase() {
    try {
        await db.connect();
        console.log("Connected to the PostgreSQL database.");
    } catch (error) {
        console.error("Failed to connect to the PostgreSQL database:", error);
    }
}

const publicDirectoryPath = path.join(__dirname, '..', 'public');
app.use(express.static(publicDirectoryPath));

// Mailgun configuration
const mailgun = new Mailgun(formData);
const mg = mailgun.client({username: 'api', key: process.env.MAILGUN_API_KEY});
const MAILGUN_DOMAIN = process.env.MAILGUN_DOMAIN;

// Function to send email using Mailgun or fallback to console.log
async function sendEmail(to, subject, text, html) {
    if (process.env.NODE_ENV === 'production') {
        try {
            const msg = await mg.messages.create(MAILGUN_DOMAIN, {
                from: `Chukkl Team <mailgun@${MAILGUN_DOMAIN}>`,
                to: [to],
                subject: subject,
                text: text,
                html: html
            });
            console.log('Email sent:', msg);
            return msg;
        } catch (error) {
            console.error('Error sending email:', error);
            throw error;
        }
    } else {
        // In development, log the email content instead of sending
        console.log('Email content (DEV MODE):');
        console.log('To:', to);
        console.log('Subject:', subject);
        console.log('Text:', text);
        console.log('HTML:', html);
    }
}

// Function to generate a random token
function generateToken() {
    return crypto.randomBytes(32).toString('hex');
}

// Route for registration page
app.get('/register', (req, res) => {
    res.sendFile(path.join(publicDirectoryPath, 'register.html'));
});

// Route for handling registration
app.post('/register', async (req, res) => {
    const { fullname, email, phone, dob, password } = req.body;

    try {
        if (!fullname || !email || !phone || !dob || !password) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        const userCollection = mongoDB.collection('users');
        const existingUser = await userCollection.findOne({ $or: [{ email }, { phone }] });

        if (existingUser) {
            if (existingUser.email === email) {
                return res.status(409).json({ message: 'Email already exists' });
            } else if (existingUser.phone === phone) {
                return res.status(409).json({ message: 'Phone number already exists' });
            }
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const emailToken = generateToken();
        const confirmationLink = `http://your-domain.com/confirm-email?token=${emailToken}`;

        const newUser = {
            fullname: fullname.toString(),
            email,
            phone,
            dob: new Date(dob),
            password: hashedPassword,
            emailToken,
            isConfirmed: false,
            createdAt: new Date(),
        };

        const result = await userCollection.insertOne(newUser);

        if (!result.acknowledged) {
            throw new Error('Failed to insert user into database');
        }

        // Attempt to send confirmation email
        try {
            await sendEmail(
                email,
                'Chukkl: Confirm your Email',
                `Hi ${fullname},\n\nThank you for registering. Please click the link below to confirm your email address:\n\n${confirmationLink}`,
                `<p>Hi ${fullname},</p>
                 <p>Thank you for registering. Please click the link below to confirm your email address:</p>
                 <a href="${confirmationLink}">Confirm Email</a>`
            );
            res.status(201).json({ message: 'User registered successfully. Please check your email to confirm your registration.' });
        } catch (emailError) {
            console.error("Error sending confirmation email:", emailError);
            res.status(201).json({ 
                message: 'User registered successfully. Email confirmation is currently unavailable. Please contact support to confirm your account.' 
            });
        }
    } catch (error) {
        console.error("Error registering user:", error);
        res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
});

// Route for email confirmation
app.get('/confirm-email', async (req, res) => {
    const { token } = req.query;

    try {
        const userCollection = mongoDB.collection('users');
        const user = await userCollection.findOne({ emailToken: token });

        if (!user) {
            return res.status(400).json({ message: 'Invalid token' });
        }

        await userCollection.updateOne({ _id: user._id }, { $set: { isConfirmed: true, emailToken: null } });

        res.status(200).json({ message: 'Email confirmed successfully' });
    } catch (error) {
        console.error("Error confirming email:", error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// Route for login page
app.get('/login', (req, res) => {
    res.sendFile(path.join(publicDirectoryPath, 'login.html'));
});

// User cannot login until email is confirmed
app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const userCollection = mongoDB.collection('users');
        const user = await userCollection.findOne({ email });

        if (!user) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        if (!user.isConfirmed) {
            return res.status(403).json({ message: 'Please confirm your email to log in' });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        // Proceed with login logic (e.g., generating a session or JWT)
        res.status(200).json({ message: 'Login successful' });
    } catch (error) {
        console.error("Error during login:", error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

app.post('/check-registration', async (req, res) => {
    const { email, phone } = req.body;

    try {
        const userCollection = mongoDB.collection('users');

        const emailExists = await userCollection.findOne({ email });
        if (emailExists) {
            return res.status(409).json({ exists: true, message: 'Email already registered' });
        }

        const phoneExists = await userCollection.findOne({ phone });
        if (phoneExists) {
            return res.status(409).json({ exists: true, message: 'Phone number already registered' });
        }

        res.status(200).json({ exists: false, message: 'Email and phone are available' });
    } catch (error) {
        console.error("Error checking registration:", error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});


// Route for about page
app.get('/about', (req, res) => {
    res.sendFile(path.join(publicDirectoryPath, 'about_us.html'));
});

// Route for "/kids"
app.get('/kids', (req, res) => {
    res.sendFile(path.join(publicDirectoryPath, 'index_kids.html'));
});

// Route for "/kids/about"
app.get('/kids/about', (req, res) => {
    res.sendFile(path.join(publicDirectoryPath, 'about_us_kids.html'));
});

// Route for "/on_demand"
app.get('/on_demand', (req, res) => {
    res.sendFile(path.join(publicDirectoryPath, 'on_demand.html'));
});

// Route for Ivan the Inspector
app.get('/ivan_the_inspector', (req, res) => {
    res.sendFile(path.join(publicDirectoryPath, 'ivan_the_inspector.html'));
});

// Route for Art with Ashley
app.get('/art_with_ashley', (req, res) => {
    res.sendFile(path.join(publicDirectoryPath, 'art_with_ashley.html'));
});

// Route for Miss Linky
app.get('/miss_linky', (req, res) => {
    res.sendFile(path.join(publicDirectoryPath, 'miss_linky.html'));
});

// Route for GoGarbage
app.get('/gogarbage', (req, res) => {
    res.sendFile(path.join(publicDirectoryPath, 'gogarbage.html'));
});


async function fetchChannelsFromDatabase() {
    const query = `SELECT c.channel_id, c.name, c.maturity_rating, c.bio FROM Channels c`;
    try {
        const client = await db.connect();
        const { rows } = await client.query(query);
        client.release();
        return rows;
    } catch (error) {
        console.error("Error fetching channels from database:", error);
        return [];
    }
}

async function fetchChannelsForDay(dayOfWeek) {
    const query = `
        SELECT DISTINCT ch.channel_id, ch.name, ch.tags, ch.bio, ch.maturity_rating
        FROM Channels ch
        JOIN Schedules s ON ch.channel_id = s.channel_id
        WHERE s.Days = $1
        ORDER BY ch.channel_id`;
    try {
        const client = await db.connect();
        const { rows } = await client.query(query, [dayOfWeek]);
        client.release();
        return rows;
    } catch (error) {
        console.error("Error fetching channels for day:", error);
        return [];
    }
}

async function fetchChannelDetailsWhenMiss(channelId) {
    const query = `SELECT c.channel_id, c.name, c.maturity_rating, c.bio FROM Channels c WHERE c.channel_id = $1`;
    try {
        const client = await db.connect();
        const { rows } = await client.query(query, [channelId]);
        client.release();
        return rows[0];
    } catch (error) {
        console.error("Error fetching channel details:", error);
        return null;
    }
}

async function fetchAllVideoDetailsFromDatabase() {
    const query = `SELECT * FROM Videos`;
    try {
        const client = await db.connect();
        const { rows } = await client.query(query);
        client.release();
        return rows;
    } catch (error) {
        console.error("Error fetching video details from database:", error);
        return [];
    }
}

async function fetchScheduleDetailsForChannelAndDay(channelId, dayOfWeek) {
    const query = `
        SELECT s.schedule_id, s.video_id, v.title, v.description, s.start_time, s.end_time, s.channel_id
        FROM Schedules s
        JOIN Videos v ON s.video_id = v.video_id
        WHERE s.channel_id = $1 AND s.Days = $2
        ORDER BY s.start_time`;
    try {
        const client = await db.connect();
        const { rows } = await client.query(query, [channelId, dayOfWeek]);
        client.release();
        return rows;
    } catch (error) {
        console.error("Error fetching schedule details for channel:", error);
        return [];
    }
}

app.get('/channels/dayoftheweek/:day', async (req, res) => {
    const dayOfWeek = req.params.day;
    const cacheKey = `channels_day_${dayOfWeek}`;

    try {
        let channelsData = localCache.get(cacheKey);
        if (!channelsData) {
            channelsData = await memcachedClient.get(cacheKey);

            if (channelsData && channelsData.value) {
                channelsData = JSON.parse(channelsData.value.toString());
                localCache.set(cacheKey, channelsData);
            } else {
                console.log(`Cache miss for channels on ${dayOfWeek}`);
                channelsData = await fetchChannelsForDay(dayOfWeek);
                await memcachedClient.set(cacheKey, JSON.stringify(channelsData), { expires: 3600 });
                localCache.set(cacheKey, channelsData);
            }
        }

        res.json(channelsData);
    } catch (error) {
        console.error("Error fetching channels for the day from cache:", error);
        res.status(500).send('Internal Server Error');
    }
});

app.get('/channel/:id', async (req, res) => {
    const channelId = req.params.id;
    const cacheKey = `channel_${channelId}`;

    try {
        let channelDetails = localCache.get(cacheKey);
        if (!channelDetails) {
            channelDetails = await memcachedClient.get(cacheKey);
            if (channelDetails && channelDetails.value) {
                channelDetails = JSON.parse(channelDetails.value.toString());
                localCache.set(cacheKey, channelDetails);
            } else {
                channelDetails = await fetchChannelDetailsWhenMiss(channelId);
                await memcachedClient.set(cacheKey, JSON.stringify(channelDetails), { expires: 3600 });
                localCache.set(cacheKey, channelDetails);
            }
        }

        res.json(channelDetails);
    } catch (error) {
        console.error("Error fetching channel details:", error);
        res.status(500).send('Internal Server Error');
    }
});

app.get('/channels', async (req, res) => {
    const cacheKey = 'all_channels';

    try {
        let channels = localCache.get(cacheKey);
        if (!channels) {
            channels = await memcachedClient.get(cacheKey);

            if (channels && channels.value) {
                channels = JSON.parse(channels.value.toString());
                localCache.set(cacheKey, channels);
            } else {
                console.log('Cache miss for all_channels');
                channels = await fetchChannelsFromDatabase();
                await memcachedClient.set(cacheKey, JSON.stringify(channels), { expires: 3600 });
                localCache.set(cacheKey, channels);
            }
        }

        res.json(channels);
    } catch (error) {
        console.error("Error fetching channels:", error);
        res.status(500).send('Internal Server Error');
    }
});

app.post('/videos', async (req, res) => {
    const { channelId, timezone } = req.body;
    const currentTimeMoment = moment().tz(timezone);
    const currentTime = currentTimeMoment.format('HH:mm:ss');
    const dayOfWeek = currentTimeMoment.format('dddd');

    try {
        let videoId = await getCurrentVideoIdFromCache(channelId, currentTimeMoment, timezone, dayOfWeek);
        if (!videoId) {
            console.log(`Cache miss for video on channel ${channelId} at ${currentTime}`);
            const videos = await fetchVideoDetailsFromDatabase(channelId, currentTime);
            videoId = videos.length > 0 ? videos[0].video_id : null;
        }

        if (!videoId) {
            return res.status(404).json({ message: 'No video is scheduled to play at this time.' });
        }

        const cacheKey = `video_details_${videoId}`;
        let videoDetails = localCache.get(cacheKey);
        if (!videoDetails) {
            videoDetails = await memcachedClient.get(cacheKey);
            if (videoDetails && videoDetails.value) {
                videoDetails = JSON.parse(videoDetails.value.toString());
                localCache.set(cacheKey, videoDetails);
            } else {
                const videos = await fetchVideoDetailsFromDatabase(channelId, currentTime);
                videoDetails = videos[0];
                await memcachedClient.set(cacheKey, JSON.stringify(videoDetails), { expires: 3600 });
                localCache.set(cacheKey, videoDetails);
            }
        }

        const scheduleTimes = await fetchScheduleTimesForVideo(videoId, channelId, currentTimeMoment);

        res.json(formatVideoResponse(videoDetails, scheduleTimes));
    } catch (error) {
        console.error("Error fetching videos:", error);
        res.status(500).send('Internal Server Error');
    }
});

async function fetchVideoDetailsFromDatabase(channelId, currentTime) {
    const query = `
        SELECT v.url, v.people, v.video_id, v.channel_id, s.start_time, s.end_time 
        FROM Schedules s
        JOIN Videos v ON s.video_id = v.video_id
        WHERE s.channel_id = $1
        AND $2 BETWEEN s.start_time AND s.end_time
        ORDER BY s.start_time`;

    try {
        const client = await db.connect();
        const { rows } = await client.query(query, [channelId, currentTime]);
        client.release();
        return rows;
    } catch (error) {
        console.error("Error fetching video details from database:", error);
        return [];
    }
}

async function getCurrentVideoIdFromCache(channelId, currentTime, userTimeZone, dayOfWeek) {
    const scheduleKey = `schedule_channel_${channelId}_${dayOfWeek}`;
    let scheduleData = localCache.get(scheduleKey);
    if (!scheduleData) {
        scheduleData = await memcachedClient.get(scheduleKey);

        if (scheduleData && scheduleData.value) {
            scheduleData = JSON.parse(scheduleData.value.toString());
            localCache.set(scheduleKey, scheduleData);
        } else {
            return null;
        }
    }

    const currentVideo = scheduleData.find(entry => {
        const startTime = moment.tz(entry.start_time, "HH:mm:ss", userTimeZone);
        const endTime = moment.tz(entry.end_time, "HH:mm:ss", userTimeZone);

        const currentTimeOnly = moment(currentTime.format("HH:mm:ss"), "HH:mm:ss");
        const startTimeOnly = moment(startTime.format("HH:mm:ss"), "HH:mm:ss");
        const endTimeOnly = moment(endTime.format("HH:mm:ss"), "HH:mm:ss");

        return currentTimeOnly.isBetween(startTimeOnly, endTimeOnly, null, '[]');
    });

    return currentVideo ? currentVideo.video_id : null;
}

function formatVideoResponse(video, scheduleTimes) {
    const urlParts = video.url.split('?');
    const baseUrl = urlParts[0];
    const queryParams = new URLSearchParams(urlParts[1]);
    const autoPlayUrl = `${baseUrl}?${queryParams.toString()}`;

    return {
        videoID: video.video_id,
        embedUrl: autoPlayUrl,
        endTime: scheduleTimes ? scheduleTimes.end_time : video.end_time,
        startTime: scheduleTimes ? scheduleTimes.start_time : video.start_time,
        vChannelId: video.channel_id,
        category: video.category_id,
        video_cast: video.people
    };
}

async function fetchScheduleTimesForVideo(videoId, channelId, currentTime) {
    const dayOfWeek = moment(currentTime).format('dddd');
    const scheduleKey = `schedule_channel_${channelId}_${dayOfWeek}`;
    let scheduleData = localCache.get(scheduleKey);
    if (!scheduleData) {
        scheduleData = await memcachedClient.get(scheduleKey);

        if (scheduleData && scheduleData.value) {
            scheduleData = JSON.parse(scheduleData.value.toString());
            localCache.set(scheduleKey, scheduleData);
        } else {
            return null;
        }
    }

    for (const schedule of scheduleData) {
        if (schedule.video_id === videoId) {
            let startTime = moment.tz(schedule.start_time, "HH:mm:ss", currentTime.tz());
            let endTime = moment.tz(schedule.end_time, "HH:mm:ss", currentTime.tz());

            startTime = startTime.set({
                year: currentTime.year(),
                month: currentTime.month(),
                date: currentTime.date()
            });

            endTime = endTime.set({
                year: currentTime.year(),
                month: currentTime.month(),
                date: currentTime.date()
            });

            if (currentTime.isBetween(startTime, endTime, null, '[]')) {
                return {
                    start_time: schedule.start_time,
                    end_time: schedule.end_time
                };
            }
        }
    }
    return null;
}

app.get('/schedules', async (req, res) => {
    const { channelId, dayOfWeek } = req.query;

    if (!channelId || !dayOfWeek) {
        return res.status(400).json({ error: 'Channel ID and day of week are required' });
    }

    const cacheKey = `schedule_channel_${channelId}_${dayOfWeek}`;

    try {
        let scheduleData = localCache.get(cacheKey);
        if (!scheduleData) {
            scheduleData = await memcachedClient.get(cacheKey);

            if (scheduleData && scheduleData.value) {
                scheduleData = JSON.parse(scheduleData.value.toString());
                localCache.set(cacheKey, scheduleData);
            } else {
                console.log("schedule miss");
                scheduleData = await fetchScheduleDetailsForChannelAndDay(channelId, dayOfWeek);
                await memcachedClient.set(cacheKey, JSON.stringify(scheduleData), { expires: 3600 });
                localCache.set(cacheKey, scheduleData);
            }
        }

        res.json(scheduleData);
    } catch (error) {
        console.error("Error fetching schedule:", error);
        res.status(500).send('Internal Server Error');
    }
});


app.use(express.static(path.join(__dirname, '../public')));


async function startServer() {
    await connectToDatabase();  // Connect to PostgreSQL
    await connectToMongoDB();   // Connect to MongoDB Atlas
    const server = app.listen(PORT, () => {
        console.log(`Server started on http://localhost:${PORT}`);
    });
    server.maxConnections = 10000;
    server.timeout = 120000;
}

if (cluster.isMaster) {
    const numCPUs = os.cpus().length;
    console.log(`Master ${process.pid} is running`);

    for (let i = 0; i < numCPUs; i++) {
        cluster.fork();
    }

    cluster.on('exit', (worker, code, signal) => {
        console.log(`Worker ${worker.process.pid} died`);
        cluster.fork();
    });
} else {
    startServer();
}

process.on('SIGINT', async () => {
    console.log('Shutting down server...');
    if (db) {
        await db.end();
    }
    if (mongoClient) {
        await mongoClient.close();
    }
    process.exit(0);
});
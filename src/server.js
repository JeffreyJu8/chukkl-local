const { Pool } = require('pg');
const moment = require('moment-timezone');
require('dotenv').config({ path: 'src/.env' });
const path = require('path');
const express = require('express');
const compression = require('compression');
const memjs = require('memjs');
const NodeCache = require('node-cache'); // Import node-cache
const cluster = require('cluster');
const os = require('os');

const app = express();
const cors = require('cors');
app.use(cors());
app.use(compression());
app.use(express.json());

const PORT = process.env.PORT || 3003;

const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    port: process.env.DB_PORT,
    ssl: { rejectUnauthorized: false },
    max: 20, // Increase if necessary
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
};

const db = new Pool(dbConfig);

const memcachedClient = memjs.Client.create(process.env.MEMCACHED_SERVERS, {
    username: process.env.MEMCACHED_USERNAME,
    password: process.env.MEMCACHED_PASSWORD,
    timeout: 5000,
});

const localCache = new NodeCache({ stdTTL: 3600 }); // Local in-memory cache with TTL of 1 hour

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

// Route for "/about"
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
app.get('/on_demand/ivan_the_inspector', (req, res) => {
    res.sendFile(path.join(publicDirectoryPath, 'on_demand.html'));
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
    await connectToDatabase();
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
    process.exit(0);
});

const { Pool } = require('pg');
const moment = require('moment-timezone');
require('dotenv').config({ path: 'src/.env' });
const path = require('path');
const express = require('express');
const compression = require('compression');
const memjs = require('memjs');

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
    max: 10,
};

const db = new Pool(dbConfig);

const memcachedClient = memjs.Client.create(process.env.MEMCACHED_SERVERS, {
    username: process.env.MEMCACHED_USERNAME,
    password: process.env.MEMCACHED_PASSWORD
});


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

async function preloadAllChannels() {
    const channels = await fetchChannelsFromDatabase();
    const cacheKey = 'all_channels';
    await memcachedClient.set(cacheKey, JSON.stringify(channels));
}

async function preloadIndividualChannels() {
    const channels = await fetchChannelsFromDatabase();
    for (const channel of channels) {
        const cacheKey = `channel_${channel.channel_id}`;
        await memcachedClient.set(cacheKey, JSON.stringify(channel));
    }
}

async function fetchChannelsFromDatabase() {
    const query = `SELECT c.channel_id, c.name, c.maturity_rating, c.bio FROM Channels c`;
    const { rows } = await db.query(query);
    return rows;
}

async function preloadChannelsByDay() {
    const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    for (const day of daysOfWeek) {
        const channels = await fetchChannelsForDay(day);
        const cacheKey = `channels_day_${day}`;
        await memcachedClient.set(cacheKey, JSON.stringify(channels));
    }
}

async function fetchChannelsForDay(dayOfWeek) {
    const query = `
        SELECT DISTINCT ch.channel_id, ch.name, ch.tags, ch.bio, ch.maturity_rating
        FROM Channels ch
        JOIN Schedules s ON ch.channel_id = s.channel_id
        WHERE s.Days = $1
        ORDER BY ch.channel_id`;

    const { rows } = await db.query(query, [dayOfWeek]);
    return rows;
}

async function fetchChannelDetailsWhenMiss(channelId) {
    const query = `SELECT c.channel_id, c.name, c.maturity_rating, c.bio FROM Channels c WHERE c.channel_id = $1`;
    const { rows } = await db.query(query, [channelId]);
    return rows[0];
}

async function preloadAllVideoDetails() {
    const videos = await fetchAllVideoDetailsFromDatabase();
    for (const video of videos) {
        const cacheKey = `video_details_${video.video_id}`;
        await memcachedClient.set(cacheKey, JSON.stringify(video));
    }
    console.log('Preloaded all video details into cache');
}

async function fetchAllVideoDetailsFromDatabase() {
    const query = `SELECT * FROM Videos`;
    try {
        const { rows } = await db.query(query);
        return rows;
    } catch (error) {
        console.error("Error fetching video details from database:", error);
        return [];
    }
}

async function preloadAndCacheSchedules() {
    const channels = await fetchChannelsFromDatabase();
    for (const channel of channels) {
        const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        for (const day of daysOfWeek) {
            const schedule = await fetchScheduleDetailsForChannelAndDay(channel.channel_id, day);
            const scheduleKey = `schedule_channel_${channel.channel_id}_${day}`;
            await memcachedClient.set(scheduleKey, JSON.stringify(schedule));
        }
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
        const { rows } = await db.query(query, [channelId, dayOfWeek]);
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
        let channelsData = await memcachedClient.get(cacheKey);

        if (channelsData && channelsData.value) {
            const channels = JSON.parse(channelsData.value.toString());
            res.json(channels);
        } else {
            console.error(`Cache miss for channels on ${dayOfWeek}. Consider refreshing cache.`);
            res.status(404).send('Channels not found for the specified day.');
        }
    } catch (error) {
        console.error("Error fetching channels for the day from cache:", error);
        res.status(500).send('Internal Server Error');
    }
});

app.get('/channel/:id', async (req, res) => {
    const channelId = req.params.id;
    const cacheKey = `channel_${channelId}`;

    try {
        let channelDetails = await memcachedClient.get(cacheKey);
        if (channelDetails && channelDetails.value) {
            channelDetails = JSON.parse(channelDetails.value.toString());
        } else {
            channelDetails = await fetchChannelDetailsWhenMiss(channelId);
            await memcachedClient.set(cacheKey, JSON.stringify(channelDetails));
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
        let channels = await memcachedClient.get(cacheKey);

        if (channels && channels.value) {
            channels = JSON.parse(channels.value.toString());
            res.json(channels);
        } else {
            console.log('Cache miss for all_channels. Consider preloading or checking cache setup.');
            const channelsFromDb = await fetchChannelsFromDatabase();
            await memcachedClient.set(cacheKey, JSON.stringify(channelsFromDb));
            res.json(channelsFromDb);
        }
    } catch (error) {
        console.error("Error fetching channels:", error);
        res.status(500).send('Internal Server Error');
    }
});

app.post('/videos', async (req, res) => {
    const { channelId, timezone } = req.body;
    const currentTime = moment().tz(timezone).format('HH:mm:ss');
    const currentTimeMoment = moment().tz(timezone);
    const dayOfWeek = currentTimeMoment.format('dddd');

    try {
        const videoId = await getCurrentVideoIdFromCache(channelId, currentTimeMoment, timezone, dayOfWeek);

        if (!videoId) {
            return res.status(404).json({ message: 'No video is scheduled to play at this time.' });
        }

        const cacheKey = `video_details_${videoId}`;
        let videoDetails = await memcachedClient.get(cacheKey);

        if (videoDetails && videoDetails.value) {
            videoDetails = JSON.parse(videoDetails.value.toString());
        } else {
            const videos = await fetchVideoDetailsFromDatabase(channelId, currentTime);
            videoDetails = videos[0];
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

    const { rows } = await db.query(query, [channelId, currentTime]);
    return rows;
}

async function getCurrentVideoIdFromCache(channelId, currentTime, userTimeZone, dayOfWeek) {
    const scheduleKey = `schedule_channel_${channelId}_${dayOfWeek}`;
    let scheduleData = await memcachedClient.get(scheduleKey);

    if (scheduleData && scheduleData.value) {
        const schedule = JSON.parse(scheduleData.value.toString());

        const currentVideo = schedule.find(entry => {
            const startTime = moment.tz(entry.start_time, "HH:mm:ss", userTimeZone);
            const endTime = moment.tz(entry.end_time, "HH:mm:ss", userTimeZone);

            const currentTimeOnly = moment(currentTime.format("HH:mm:ss"), "HH:mm:ss");
            const startTimeOnly = moment(startTime.format("HH:mm:ss"), "HH:mm:ss");
            const endTimeOnly = moment(endTime.format("HH:mm:ss"), "HH:mm:ss");

            return currentTimeOnly.isBetween(startTimeOnly, endTimeOnly, null, '[]');
        });
        return currentVideo ? currentVideo.video_id : null;
    }
    return null;
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
    let scheduleData = await memcachedClient.get(scheduleKey);

    if (scheduleData && scheduleData.value) {
        const schedules = JSON.parse(scheduleData.value.toString());
        for (const schedule of schedules) {
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
        let scheduleData = await memcachedClient.get(cacheKey);

        if (scheduleData && scheduleData.value) {
            const schedules = JSON.parse(scheduleData.value.toString());
            res.json(schedules);
        } else {
            console.log("schedule miss");
            const schedules = await fetchScheduleDetailsForChannelAndDay(channelId, dayOfWeek);
            await memcachedClient.set(cacheKey, JSON.stringify(schedules));
            res.json(schedules);
        }
    } catch (error) {
        console.error("Error fetching schedule:", error);
        res.status(500).send('Internal Server Error');
    }
});

app.use(express.static(path.join(__dirname, '../public')));

async function startServer() {
    await connectToDatabase();
    // await preloadAllChannels();
    // await preloadIndividualChannels();
    // await preloadChannelsByDay();
    // await preloadAllVideoDetails();
    // await preloadAndCacheSchedules();
    app.listen(PORT, () => {
        console.log(`Server started on http://localhost:${PORT}`);
    });
}

startServer();

process.on('SIGINT', async () => {
    console.log('Shutting down server...');
    if (db) {
        await db.end();
    }
    process.exit(0);
});

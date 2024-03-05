const express = require('express');
const memjs = require('memjs');
const mysql = require('mysql2/promise');
const moment = require('moment-timezone');
require('dotenv').config({ path: 'src/.env' });
const path = require('path');


const PORT = process.env.PORT || 3003;
let db;


const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    port: process.env.DB_PORT, 
    timezone: 'Z'
};


const cors = require('cors');
const app = express();
const currentTimeUtc = moment.utc();
app.use(cors());
app.use(express.json());


async function connectToDatabase() {
    try {
        db = await mysql.createConnection(dbConfig);
        console.log("Connected to the database.");
    } catch (error) {
        console.error("Failed to connect to the database:", error);
    }
}


async function preloadAllChannels() {
    const channels = await fetchChannelsFromDatabase();
    const cacheKey = 'all_channels';
    await memcachedClient.set(cacheKey, JSON.stringify(channels), { expires: 3600 });
    // console.log('Preloaded all channels into cache: ', channels);
}

async function preloadIndividualChannels() {
    const channels = await fetchChannelsFromDatabase();
    // Iterate over each channel and preload its details into the cache
    for (const channel of channels) {
        const cacheKey = `channel_${channel.channel_id}`;
        await memcachedClient.set(cacheKey, JSON.stringify(channel), { expires: 3600 });
    }
    console.log('Preloaded individual channel details into cache');
}



const memcachedClient = memjs.Client.create(process.env.MEMCACHIER_SERVERS, {
    username: process.env.MEMCACHIER_USERNAME,
    password: process.env.MEMCACHIER_PASSWORD
});



async function fetchChannelsFromDatabase() {
    const query = `SELECT c.channel_id, c.name, c.maturity_rating, c.bio FROM Channels c`;
    const [channels] = await db.query(query);
    return channels;
}


async function fetchChannelDetailsWhenMiss(channelId) {
    const query = `SELECT c.channel_id, c.name, c.maturity_rating, c.bio FROM Channels c WHERE c.channel_id = ?`;
    const [results] = await db.query(query, [channelId]);
    return results[0]; // Assuming the query returns one row per channel ID
}



app.get('/channel/:id', async (req, res) => {
    const channelId = req.params.id; // Extract channel ID from URL parameters
    const cacheKey = `channel_${channelId}`;

    try {
        let channelDetails = await memcachedClient.get(cacheKey);
        if (channelDetails && channelDetails.value) {
            console.log('Serving channel details from cache.');
            channelDetails = JSON.parse(channelDetails.value.toString());
        } else {
            console.log('Cache miss. Loading channel details from database.');
            channelDetails = await fetchChannelDetailsWhenMiss(channelId);
            await memcachedClient.set(cacheKey, JSON.stringify(channelDetails), { expires: 3600 }); // Cache for 1 hour
        }
        res.json(channelDetails);
    } catch (error) {
        console.error("Error fetching channel details:", error);
        res.status(500).send('Internal Server Error');
    }
});



app.get('/channels', async (req, res) => {
    const { channel_id } = req.query;
    const cacheKey = 'all_channels';

    // Validate channel_id
    if (!channel_id) {
        return res.status(400).send('channel_id is required');
    }

    // Construct a unique cache key using channel_id
    // const cacheKey = `channel_${channel_id}`;
    try {
        let channels = await memcachedClient.get(cacheKey);
        if (channels && channels.value) {
            channels = JSON.parse(channels.value.toString());
        } else {
            channels = await fetchChannelsFromDatabase();
            await memcachedClient.set(cacheKey, JSON.stringify(channels), { expires: 3600 });
        }
        res.json(channels);
    } catch (error) {
        console.error("Error fetching channels:", error);
        res.status(500).send('Internal Server Error');
    }
});


app.get('/categories', async (req, res) => {
    const [channels] = await db.query('SELECT category_id, name FROM Categories');
    res.json(channels);
});


async function fetchVideoDetailsFromDatabase(channelId, currentTime) {
    const query = `
        SELECT v.url, v.cast, s.start_time, s.end_time 
        FROM Schedules s
        JOIN Videos v ON s.video_id = v.video_id
        WHERE s.channel_id = ?
        AND ? BETWEEN s.start_time AND s.end_time
        ORDER BY s.start_time`;
    const [videos] = await db.execute(query, [channelId, currentTime]);
    return videos;
}



app.post('/videos', async (req, res) => {
    const { channelId, timezone } = req.body;
    const currentTime = moment().tz(timezone).format('HH:mm');
    const cacheKey = `video_${channelId}_${currentTime}`;

    try {
        let videoDetails = await memcachedClient.get(cacheKey);
        if (videoDetails && videoDetails.value) {
            console.log('Serving video details from cache.');
            videoDetails = JSON.parse(videoDetails.value.toString());
        } else {
            console.log('Cache miss. Loading video details from database.');
            const videos = await fetchVideoDetailsFromDatabase(channelId, currentTime);
            if (videos.length === 0) {
                return res.status(404).json({ message: 'No video is scheduled to play at this time.' });
            }
            videoDetails = videos[0]; // Assuming you want the first matching video
            await memcachedClient.set(cacheKey, JSON.stringify(videoDetails), { expires: 900 }); // Update cache
        }
        res.json(formatVideoResponse(videoDetails)); // Send the video details to the client
    } catch (error) {
        console.error("Error fetching videos:", error);
        res.status(500).send('Internal Server Error');
    }
});



function formatVideoResponse(video) {
    const urlParts = video.url.split('?');
    const baseUrl = urlParts[0];
    const queryParams = new URLSearchParams(urlParts[1]);
    const autoPlayUrl = `${baseUrl}?${queryParams.toString()}`;
    return {
        videoID: video.video_id,
        embedUrl: autoPlayUrl,
        endTime: video.end_time,
        startTime: video.start_time,
        vChannelId: video.channel_id,
        category: video.category_id,
        video_cast: video.cast
    };
}

app.get('/videos', async (req, res) => {
    // This is a sample response. Modify as needed.
    res.json({ message: 'GET request to /videos is working!' });
});



app.get('/schedules', async (req, res) => {
    const channelId = req.query.channelId;
    
    if (!channelId) {
        return res.status(400).json({ error: 'Channel ID is required' });
    }

    try {
        const query = `
            SELECT s.video_id, v.title, v.description, s.start_time, s.end_time 
            FROM Schedules s
            JOIN Videos v ON s.video_id = v.video_id
            WHERE s.channel_id = ?`;
        const [schedules] = await db.execute(query, [channelId]);

        res.json(schedules);
    } catch (error) {
        console.error("Error fetching schedule:", error);
        res.status(500).send('Internal Server Error');
    }
});


app.post('/video/next', async (req, res) => {
    const channelId = req.body.channelId;

    if (!channelId) {
        return res.status(400).json({ error: 'Channel ID is required' });
    }

    try {
        const nextVideo = await fetchNextVideo(channelId);
        res.json(nextVideo);
    } catch (error) {
        console.error("Error fetching next video:", error);
        res.status(500).send('Internal Server Error');
    }
});


async function fetchNextVideo(channelId) {
    const currentTimeMoment = moment().tz('America/Los_Angeles');

    const query = `
        SELECT v.url, s.start_time, s.end_time
        FROM Schedules s
        JOIN Videos v ON s.video_id = v.video_id
        WHERE s.channel_id = ?
        AND s.start_time > ?
        ORDER BY s.start_time
        LIMIT 1`;

    const [videos] = await db.execute(query, [channelId, currentTimeMoment.format('HH:mm:ss')]);

    if (videos.length === 0) {
        return { message: 'No next video scheduled at this time.' };
    }

    return {
        videoID: videos[0].video_id,
        embedUrl: videos[0].url,
        startTime: videos[0].start_time,
        endTime: videos[0].end_time
    };
}



app.use(express.static(path.join(__dirname, '../public')));

async function startServer() {
    await connectToDatabase();
    await preloadAllChannels();
    await preloadIndividualChannels();
    setInterval(preloadAllChannels, 3500 * 1000);
    setInterval(preloadIndividualChannels, 3500 * 1000);
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


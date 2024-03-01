const express = require('express');
const memjs = require('memjs');
const mysql = require('mysql2/promise');
const moment = require('moment-timezone');
require('dotenv').config({ path: 'src/.env' });
const path = require('path');


const PORT = process.env.PORT || 3003;


const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: 3306,
    timezone: 'Z'
};


const cors = require('cors');
const app = express();
const currentTimeUtc = moment.utc();
app.use(cors());
app.use(express.json());


async function connectToDatabase() {
    db = await mysql.createConnection(dbConfig);
    console.log("Connected to the database.");
}


async function startServer() {
    await connectToDatabase();
    app.listen(PORT, () => {
        console.log(`Server started on http://localhost:${PORT}`);
    });
}


const memcachedServers = process.env.MEMCACHED_SERVERS;
const memcachedUsername = process.env.MEMCACHED_USERNAME;
const memcachedPassword = process.env.MEMCACHED_PASSWORD; 

const memcachedClient = memjs.Client.create(memcachedServers, {
    username: memcachedUsername,
    password: memcachedPassword,
  });


// app.get('/channels', async (req, res) => {
//     try {
//         const query = `
//             SELECT c.channel_id, c.name, c.maturity_rating, c.bio
//             FROM Channels c`;
//         const [channels] = await db.query(query);
//         res.json(channels);
//     } catch (error) {
//         console.error("Error fetching channels:", error);
//         res.status(500).send('Internal Server Error');
//     }
// });


async function fetchChannelsFromDatabase() {
    const query = `SELECT c.channel_id, c.name, c.maturity_rating, c.bio FROM Channels c`;
    const [channels] = await db.query(query);
    return channels;
}


app.get('/channels', async (req, res) => {
    const cacheKey = 'channels';
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


// app.post('/videos', async (req, res) => {
//     const { channelId, timezone } = req.body;

//     // console.log("Received timezone:", timezone);

//     // Check if timezone is provided and valid
//     if (!timezone || !moment.tz.zone(timezone)) {
//         return res.status(400).json({ message: 'Invalid or missing timezone.' });
//     }

//     try {
//         const currentTime = moment().tz(timezone).format('HH:mm:ss');
//         const query = `
//             SELECT v.url, v.cast, s.start_time, s.end_time 
//             FROM Schedules s
//             JOIN Videos v ON s.video_id = v.video_id
//             WHERE s.channel_id = ?
//             AND ? BETWEEN s.start_time AND s.end_time
//             ORDER BY s.start_time`;

//         const [videos] = await db.execute(query, [channelId, currentTime]);

//         if (videos.length === 0) {
//             return res.status(404).json({ message: 'No video is scheduled to play at this time.' });
//         }

//         const video = videos[0];
//         const urlParts = video.url.split('?');
//         const baseUrl = urlParts[0];
//         const queryParams = new URLSearchParams(urlParts[1]);
//         const autoPlayUrl = `${baseUrl}?${queryParams.toString()}`;

//         res.json({
//             videoID: video.video_id, 
//             embedUrl: autoPlayUrl, 
//             endTime: video.end_time, 
//             startTime: video.start_time, 
//             vChannelId: video.channel_id,
//             category: video.category_id, 
//             video_cast: video.cast
//         });
//     } catch (error) {
//         console.error("Error fetching videos:", error);
//         res.status(500).send('Internal Server Error');
//     }
// });


app.post('/videos', async (req, res) => {
    const { channelId, timezone } = req.body;
    if (!timezone || !moment.tz.zone(timezone)) {
        return res.status(400).json({ message: 'Invalid or missing timezone.' });
    }

    const currentTime = moment().tz(timezone).format('HH:mm:ss');
    const cacheKey = `video_${channelId}_${currentTime}`;
    try {
        let videoDetails = await memcachedClient.get(cacheKey);
        if (videoDetails && videoDetails.value) {
            videoDetails = JSON.parse(videoDetails.value.toString());
        } else {
            const videos = await fetchVideoDetailsFromDatabase(channelId, currentTime);
            if (videos.length === 0) {
                return res.status(404).json({ message: 'No video is scheduled to play at this time.' });
            }
            videoDetails = videos[0];
            await memcachedClient.set(cacheKey, JSON.stringify(videoDetails), { expires: 3600 });
        }
        res.json(formatVideoResponse(videoDetails));
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


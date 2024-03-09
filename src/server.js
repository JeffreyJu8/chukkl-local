const express = require('express');
const compression = require('compression');
const memjs = require('memjs');
const mysql = require('mysql2/promise');
const moment = require('moment-timezone');
require('dotenv').config({ path: 'src/.env' });
const path = require('path');


const app = express();
const cors = require('cors');
app.use(cors());
app.use(compression());
app.use(express.json());


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


const memcachedClient = memjs.Client.create(process.env.MEMCACHIER_SERVERS, {
    username: process.env.MEMCACHIER_USERNAME,
    password: process.env.MEMCACHIER_PASSWORD
});


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
    await memcachedClient.set(cacheKey, JSON.stringify(channels));
    // console.log('Preloaded all channels into cache: ', channels);
}

async function preloadIndividualChannels() {
    const channels = await fetchChannelsFromDatabase();
    // Iterate over each channel and preload its details into the cache
    for (const channel of channels) {
        const cacheKey = `channel_${channel.channel_id}`;
        await memcachedClient.set(cacheKey, JSON.stringify(channel));
    }
    // console.log('Preloaded individual channel details into cache');
}


async function preloadAllVideoDetails() {
    const videos = await fetchAllVideoDetailsFromDatabase();
    for (const video of videos) {
        const cacheKey = `video_details_${video.video_id}`;
        await memcachedClient.set(cacheKey, JSON.stringify(video)); // Cache for 1 hour
    }
    console.log('Preloaded all video details into cache');
}

async function preloadAndCacheSchedules() {
    const channels = await fetchChannelsFromDatabase(); 

    for (const channel of channels) {
        //console.log("channel id: ", channel.channel_id);
        const schedule = await fetchScheduleForChannel(channel.channel_id);
        if (channel.channel_id === 9) {
            //console.log("schedule for 9: ", schedule);
        }
        const scheduleKey = `schedule_channel_${channel.channel_id}`;
        //console.log("schedule: ", schedule);
        await memcachedClient.set(scheduleKey, JSON.stringify(schedule)); // Adjust expiration as needed
    }
}

async function fetchScheduleForChannel(channelId) {
    const query = `
        SELECT schedule_id, video_id, start_time, end_time, channel_id
        FROM Schedules
        WHERE channel_id = ?
        ORDER BY start_time
    `;

    try {
        const [schedules] = await db.query(query, [channelId]);
        return schedules; // Return the array of schedules without organizing by day
    } catch (error) {
        console.error("Error fetching schedule for channel:", error);
        return []; // Return an empty array or appropriate error handling
    }
}



app.get('/channel/:id', async (req, res) => {
    const channelId = req.params.id; // Extract channel ID from URL parameters
    const cacheKey = `channel_${channelId}`;

    try {
        let channelDetails = await memcachedClient.get(cacheKey);
        if (channelDetails && channelDetails.value) {
            // console.log('Serving channel details from cache.');
            //console.log(`Cache hit for channel_id=${channelId}`);
            channelDetails = JSON.parse(channelDetails.value.toString());
            //console.log("channelDetails: ", channelDetails);
        } else {
            // console.log('Cache miss. Loading channel details from database.');
            channelDetails = await fetchChannelDetailsWhenMiss(channelId);
            await memcachedClient.set(cacheKey, JSON.stringify(channelDetails)); // Cache for 1 hour
        }
        res.json(channelDetails); // send to frontend
    } catch (error) {
        console.error("Error fetching channel details:", error);
        res.status(500).send('Internal Server Error');
    }
});


app.get('/channels', async (req, res) => {
    const cacheKey = 'all_channels';

    try {
        // Attempt to retrieve all channels from cache
        let channels = await memcachedClient.get(cacheKey);

        if (channels && channels.value) {
            // If found in cache, parse and use this data
            channels = JSON.parse(channels.value.toString());
            res.json(channels);
        } else {
            // Fallback to database if necessary (although in your case, you're assuming cache always hits)
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


app.post('/videos', async (req, res) => {
    const { channelId, timezone } = req.body;
    const currentTime = moment().tz(timezone).format('HH:mm:ss');
    const currentTimeMoment = moment().tz(timezone);

    try {
        //console.log("channelId: ", channelId);
        const videoId = await getCurrentVideoIdFromCache(channelId, currentTimeMoment, timezone);
        //console.log("video id: ", videoId);

        if (!videoId) {
            return res.status(404).json({ message: 'No video is scheduled to play at this time.' });
        }

        // Cache key
        const cacheKey = `video_details_${videoId}`;

        // Retrieve video details from cache
        let videoDetails = await memcachedClient.get(cacheKey);

        // Cache hit
        if (videoDetails && videoDetails.value) {
            // Serving video details from cache
            videoDetails = JSON.parse(videoDetails.value.toString());
        } 
        else {
            // Cache miss
            //console.log('Cache miss. Consider implementing a fallback or ensuring schedules are preloaded correctly.');
            const videos = await fetchVideoDetailsFromDatabase(channelId, currentTime);
            videoDetails = videos[0];
        }

        
        const scheduleTimes = await fetchScheduleTimesForVideo(videoId, currentTimeMoment);

        res.json(formatVideoResponse(videoDetails, scheduleTimes)); // Send the video details to the client
    } catch (error) {
        console.error("Error fetching videos:", error);
        res.status(500).send('Internal Server Error');
    }
});


async function fetchAllVideoDetailsFromDatabase() {
    const query = `SELECT * FROM Videos`;
    try {
        const [videos] = await db.query(query);
        return videos;
    } catch (error) {
        console.error("Error fetching video details from database:", error);
        return [];
    }
}


async function fetchVideoDetailsFromDatabase(channelId, currentTime) {
    const query = `
        SELECT v.url, v.cast, v.video_id, v.channel_id, s.start_time, s.end_time 
        FROM Schedules s
        JOIN Videos v ON s.video_id = v.video_id
        WHERE s.channel_id = ?
        AND ? BETWEEN s.start_time AND s.end_time
        ORDER BY s.start_time`;
    const [videos] = await db.execute(query, [channelId, currentTime]);
    return videos;
}


async function getCurrentVideoIdFromCache(channelId, currentTime, userTimeZone) {
    //console.log("channelId: ", channelId);
    const scheduleKey = `schedule_channel_${channelId}`;
    let scheduleData = await memcachedClient.get(scheduleKey);
    //console.log("current time: ", currentTime);
    //console.log("timezone: ", userTimeZone);
    //console.log("schedule data: ", JSON.parse(scheduleData.value.toString()));
    if (scheduleData && scheduleData.value) {
        const schedule = JSON.parse(scheduleData.value.toString());
        // Convert schedule times to user's local time zone before comparison
        //console.log("schedule: ",schedule);
        
        const currentVideo = schedule.find(entry => {
            //console.log("start time: ", moment.tz(entry.start_time, "HH:mm:ss", userTimeZone));
            const startTime = moment.tz(entry.start_time, "HH:mm:ss", userTimeZone);
            const endTime = moment.tz(entry.end_time, "HH:mm:ss", userTimeZone);

            const currentTimeOnly = moment(currentTime.format("HH:mm:ss"), "HH:mm:ss");
            const startTimeOnly = moment(startTime.format("HH:mm:ss"), "HH:mm:ss");
            const endTimeOnly = moment(endTime.format("HH:mm:ss"), "HH:mm:ss");

            return currentTimeOnly.isBetween(startTimeOnly, endTimeOnly, null, '[]');
        });
        return currentVideo ? currentVideo.video_id : null;
    }
    return null; // Return null if no current video or schedule is not cached
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
        video_cast: video.cast
    };
}


async function fetchScheduleTimesForVideo(videoId, currentTime) {
    // Ensure currentTime is properly formatted as "HH:mm:ss"
    const currentTimeFormatted = moment(currentTime, "HH:mm:ss").format("HH:mm:ss");

    try {
        // Adjust the query to order schedules based on the closest start time to the current time
        const query = `
            SELECT start_time, end_time
            FROM Schedules
            WHERE video_id = ?
            ORDER BY ABS(TIMESTAMPDIFF(MINUTE, STR_TO_DATE(?, '%H:%i:%s'), start_time))
            LIMIT 1`;

        // Execute the query with the videoId and the currentTimeFormatted
        const [results] = await db.execute(query, [videoId, currentTimeFormatted]);
        
        if (results.length > 0) {
            const schedule = results[0];
            
            // Format start_time and end_time as "HH:mm:ss"
            const formattedStartTime = moment(schedule.start_time, "HH:mm:ss").format("HH:mm:ss");
            const formattedEndTime = moment(schedule.end_time, "HH:mm:ss").format("HH:mm:ss");

            return {
                start_time: formattedStartTime,
                end_time: formattedEndTime
            };
        } else {
            return null; // No schedule found for this videoId
        }
    } catch (error) {
        console.error(`Error fetching schedule times for video ID ${videoId}:`, error);
        return null;
    }
}


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




app.use(express.static(path.join(__dirname, '../public')));

async function startServer() {
    await connectToDatabase();
    await preloadAllChannels();
    await preloadIndividualChannels();
    await preloadAllVideoDetails();
    await preloadAndCacheSchedules();
    // setInterval(preloadAllChannels, 3500 * 1000);
    // setInterval(preloadIndividualChannels, 3500 * 1000);
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


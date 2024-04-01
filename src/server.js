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
// let db;


const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    port: process.env.DB_PORT, 
    timezone: 'Z',
    connectionLimit: 10,
};

const db = mysql.createPool(dbConfig);

const memcachedClient = memjs.Client.create(process.env.MEMCACHIER_SERVERS, {
    username: process.env.MEMCACHIER_USERNAME,
    password: process.env.MEMCACHIER_PASSWORD
});


async function connectToDatabase() {
    try {
        // db = await mysql.createPool(dbConfig);
        console.log("Database connection pool created.");
    } catch (error) {
        console.error("Failed to create the database connection pool:", error);
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



async function fetchChannelsFromDatabase() {
    const query = `SELECT c.channel_id, c.name, c.maturity_rating, c.bio FROM Channels c`;
    const [channels] = await db.query(query);
    return channels;
}


async function preloadChannelsByDay() {
    const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    for (const day of daysOfWeek) {
        const channels = await fetchChannelsForDay(day);
        const cacheKey = `channels_day_${day}`;
        await memcachedClient.set(cacheKey, JSON.stringify(channels)); // Set cache expiration as needed
    }
}


async function fetchChannelsForDay(dayOfWeek) {
    const query = `
        SELECT DISTINCT ch.channel_id, ch.name, ch.tags, ch.bio, ch.maturity_rating
        FROM Channels ch
        JOIN Schedules s ON ch.channel_id = s.channel_id
        WHERE s.Days = ?
        ORDER BY ch.channel_id`;

    const [channels] = await db.query(query, [dayOfWeek]);
    return channels;
}



async function fetchChannelDetailsWhenMiss(channelId) {
    const query = `SELECT c.channel_id, c.name, c.maturity_rating, c.bio FROM Channels c WHERE c.channel_id = ?`;
    const [results] = await db.query(query, [channelId]);
    return results[0]; // Assuming the query returns one row per channel ID
}


async function preloadAllVideoDetails() {
    const videos = await fetchAllVideoDetailsFromDatabase();
    for (const video of videos) {
        const cacheKey = `video_details_${video.video_id}`;
        await memcachedClient.set(cacheKey, JSON.stringify(video)); // Cache for 1 hour
    }
    console.log('Preloaded all video details into cache');
}


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


async function preloadAndCacheSchedules() {
    const channels = await fetchChannelsFromDatabase(); 

    for (const channel of channels) {
        const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        for (const day of daysOfWeek) {
            const schedule = await fetchScheduleDetailsForChannelAndDay(channel.channel_id, day);
            const scheduleKey = `schedule_channel_${channel.channel_id}_${day}`;
            await memcachedClient.set(scheduleKey, JSON.stringify(schedule)); // Adjust expiration as needed
        }
    }
}


async function fetchScheduleDetailsForChannelAndDay(channelId, dayOfWeek) {
    const query = `
        SELECT s.schedule_id, s.video_id, v.title, v.description, s.start_time, s.end_time, s.channel_id
        FROM Schedules s
        JOIN Videos v ON s.video_id = v.video_id
        WHERE s.channel_id = ? AND s.Days = ?
        ORDER BY s.start_time`;

    try {
        const [schedules] = await db.query(query, [channelId, dayOfWeek]);
        return schedules;
    } catch (error) {
        console.error("Error fetching schedule details for channel:", error);
        return [];
    }
}


// async function fetchScheduleDetailsForChannel(channelId) {
//     const query = `
//         SELECT s.schedule_id, s.video_id, v.title, v.description, s.start_time, s.end_time, s.channel_id
//         FROM Schedules s
//         JOIN Videos v ON s.video_id = v.video_id
//         WHERE s.channel_id = ?
//         ORDER BY s.start_time`;

//     try {
//         const [schedules] = await db.query(query, [channelId]);
//         return schedules; // Include title and description
//     } catch (error) {
//         console.error("Error fetching schedule details for channel:", error);
//         return [];
//     }
// }



app.get('/channels/dayoftheweek/:day', async (req, res) => {
    const dayOfWeek = req.params.day;
    const cacheKey = `channels_day_${dayOfWeek}`;

    try {
        // Attempt to retrieve channel data for the day from cache
        let channelsData = await memcachedClient.get(cacheKey);

        if (channelsData && channelsData.value) {
            // Cache hit, parse the data
            const channels = JSON.parse(channelsData.value.toString());
            //console.log("channels: ", channels);
            res.json(channels);
        } else {
            // Cache miss
            // In a well-preloaded scenario, this branch should rarely be hit.
            // You might log this as an unexpected event or trigger a refresh of the cache.
            console.error(`Cache miss for channels on ${dayOfWeek}. Consider refreshing cache.`);
            res.status(404).send('Channels not found for the specified day.');
        }
    } catch (error) {
        console.error("Error fetching channels for the day from cache:", error);
        res.status(500).send('Internal Server Error');
    }
});



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
    const { dayOfWeek, timezone } = req.query;
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



app.post('/videos', async (req, res) => {
    const { channelId, timezone } = req.body;
    const currentTime = moment().tz(timezone).format('HH:mm:ss');
    const currentTimeMoment = moment().tz(timezone);
    const dayOfWeek = currentTimeMoment.format('dddd');
    //console.log("channelId: ", channelId);
    

    try {
        //console.log("channelId: ", channelId);
        //const videoId = await getCurrentVideoIdFromCache(channelId, currentTimeMoment, timezone);
        const videoId = await getCurrentVideoIdFromCache(channelId, currentTimeMoment, timezone, dayOfWeek);
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

        
        // const scheduleTimes = await fetchScheduleTimesForVideo(videoId, currentTimeMoment);
        // console.log("currentTime: ", currentTimeMoment);
        const scheduleTimes = await fetchScheduleTimesForVideo(videoId, channelId, currentTimeMoment);
        // console.log("videoId: ", videoId);
        // console.log("channelId: ", channelId);
        // console.log("scheduleTimes: ", scheduleTimes);

        res.json(formatVideoResponse(videoDetails, scheduleTimes)); // Send the video details to the client
    } catch (error) {
        console.error("Error fetching videos:", error);
        res.status(500).send('Internal Server Error');
    }
});


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


async function getCurrentVideoIdFromCache(channelId, currentTime, userTimeZone, dayOfWeek) {
    //console.log("channelId: ", channelId);
    //const scheduleKey = `schedule_channel_${channelId}`;
    const scheduleKey = `schedule_channel_${channelId}_${dayOfWeek}`;
    let scheduleData = await memcachedClient.get(scheduleKey);
    //console.log("current time: ", currentTime);
    //console.log("timezone: ", userTimeZone);
    //console.log("schedule data: ", JSON.parse(scheduleData.value.toString()));
    if (scheduleData && scheduleData.value) {
        const schedule = JSON.parse(scheduleData.value.toString());
        // Convert schedule times to user's local time zone before comparison
        //console.log("schedule: ",schedule);
        
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


async function fetchScheduleTimesForVideo(videoId, channelId, currentTime) {
    const dayOfWeek = moment(currentTime).format('dddd');
    const scheduleKey = `schedule_channel_${channelId}_${dayOfWeek}`;
    let scheduleData = await memcachedClient.get(scheduleKey);
    //console.log("currTime: ", currentTime);

    if (scheduleData && scheduleData.value) {
        const schedules = JSON.parse(scheduleData.value.toString());
        //console.log("schedules: ", schedules);
        for (const schedule of schedules) {
            if (schedule.video_id === videoId) {
                //console.log("here");
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

                // console.log("startTime: ", startTime);
                // console.log("endTime: ", endTime);
                // console.log("currTime: ", currentTime);

                if (currentTime.isBetween(startTime, endTime, null, '[]')) {
                    // console.log("return");
                    return {
                        start_time: schedule.start_time,
                        end_time: schedule.end_time
                    };
                }
            }
        }
    }
    return null; // No matching schedule found
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
            // If no data in cache, fetch from the database and update the cache
            const schedules = await fetchScheduleDetailsForChannelAndDay(channelId, dayOfWeek);
            await memcachedClient.set(cacheKey, JSON.stringify(schedules)); // Optionally set expiration
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
    await preloadAllChannels();
    await preloadIndividualChannels();
    await preloadChannelsByDay();
    await preloadAllVideoDetails();
    await preloadAndCacheSchedules();
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


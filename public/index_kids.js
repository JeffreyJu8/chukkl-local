var player;
var scheduledStartTime;
var scheduledEndTime;
var currVideoCast;
var checkForVideoInterval;
var selectedChannelId;
var currVideoId;
var channelSchedules = {};
var currentlyExpandedChannel = null;
var currentVideoDetails = {};
var isLoading = false; 


const API_BASE_URL = window.location.hostname.includes('localhost')
    ? 'http://localhost:3003'
    : 'https://chukkl-heroku-839b30d27713.herokuapp.com';


function debounce(func, wait) {
    let timeout;

    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };

        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}


async function channelSelectionHandler(channel, element) {
    if (isLoading) return; // Prevent further interaction if already loading
    isLoading = true; // Set loading state to true

    if (currentlyExpandedChannel && currentlyExpandedChannel !== element) {
        collapseChannel(currentlyExpandedChannel);
    }

    try {
        await fetchChannelDetails(channel.channel_id);
        await getVideoCast(channel.channel_id); // Ensure this completes before proceeding
        selectChannel(channel.channel_id); // triggers the video change

        element.classList.toggle('channel-block-expanded');
        const channelName = element.querySelector('.channel-name');
        if (channelName) {
            channelName.classList.toggle('channel-name-expanded');
        }

        const descriptions = element.querySelectorAll('.schedule-video-description');
        descriptions.forEach(desc => desc.style.display = desc.style.display === 'none' ? 'block' : 'none');

        const channelSche = element.querySelector('.channel-schedule');
        if (channelSche) {
            channelSche.classList.toggle('channel-schedule-expanded');
        }

        const scheduleItems = element.querySelectorAll('.schedule-item');
        scheduleItems.forEach(item => item.classList.toggle('schedule-item-expanded'));
    
        getChannelInfo(channel, element.dataset.styleClass);
        currentlyExpandedChannel = element.classList.contains('channel-block-expanded') ? element : null;
    } catch (error) {
        console.error("Error during channel selection:", error);
        // Handle the error appropriately (e.g., show an error message to the user)
    } finally {
        isLoading = false; // Reset loading state regardless of success or failure
    }
}


async function fetchChannelDetails(channelId) {
    try {
        const response = await fetch(`${API_BASE_URL}/channel/${channelId}`);
        if (!response.ok) {
            console.log(`Cache hit for channel ${channelId}`);
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const channelDetails = await response.json();
        console.log("channel details: ", channelDetails);
        // Update the UI with the detailed information about the channel
        updateChannelUI(channelDetails);
    } catch (error) {
        console.error("Error fetching channel details:", error);
    }
}


function updateChannelUI(details) {
    // Update the UI with the channel's detailed information
    const bioElement = document.getElementById('channelBio'); 
    if (bioElement) {
        bioElement.textContent = details.bio;
    }

    const castElement = document.getElementById('videoCast'); 
    if (castElement) {
        castElement.innerHTML = `<strong>Cast:</strong> ${details.cast || 'N/A'}`;
    }
}


async function defaultVideo(){

    try {
        const response = await fetch(`${API_BASE_URL}/channels`); 
        const channels = await response.json();
        const limitedChannels = channels.slice(25, 50);
        const grid = document.getElementById('channelsGrid');
        grid.innerHTML = '';
        // console.log("kids channels: ", limitedChannels);

        for (const [index, channel] of limitedChannels.entries()) {
            // console.log("loop index: ", index);
            if (index === 0) {
                console.log("default channel: ", channel);
                getChannelInfo(channel, 'channel-style-' + index);
            }
        }
    } catch (error) {
        console.error("Error fetching channels:", error);
    }

    localStorage.setItem('defaultVideoCalled', 'true');
}

async function fetchChannels() {
    const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const dayOfWeek = getCurrentDayOfWeek();

    try {
        const response = await fetch(`${API_BASE_URL}/channels/dayoftheweek/${dayOfWeek}?timezone=${encodeURIComponent(userTimeZone)}`);
        const channels = await response.json();

        // Grab only the first 25 channels
        const limitedChannels = channels.slice(25, 50);

        console.log("channel: ", limitedChannels);

        const grid = document.getElementById('channelsGrid');
        grid.innerHTML = ''; // Clear the grid before adding new channels

        for (const [index, channel] of limitedChannels.entries()) {
            const channelBlock = document.createElement('div');
            channelBlock.className = 'channel-block';
            channelBlock.id = channel.name;
            channelBlock.dataset.styleClass = 'channel-style-' + index;

            channelBlock.onclick = debounce(function() {
                channelSelectionHandler(channel, channelBlock);
            }, 300);

            // Channel Content container
            const channelContent = document.createElement('div');
            channelContent.className = 'channel-content';
            channelContent.id = channel.name;

            // Channel Name
            const nameofChannel = channel.name.split(" ");

            const channelName = document.createElement('div');
            channelName.className = 'channel-name';
            nameofChannel.forEach(word => {
                const wordSpan = document.createElement('div');
                wordSpan.textContent = word;
                wordSpan.className = 'name-of-channel';
                wordSpan.id = channel.name;
                channelName.appendChild(wordSpan);
            });
            channelContent.appendChild(channelName);

            // Channel Schedule
            const schedule = await fetchScheduleForChannel(channel.channel_id);
            const scheduleBlock = createScheduleBlock(channel.channel_id, channel.maturity_rating, channel.name);
            channelContent.appendChild(scheduleBlock);

            channelBlock.appendChild(channelContent);

            grid.appendChild(channelBlock);
        }

        const channelNames = document.querySelectorAll('.channel-name');
        channelNames.forEach((channelName, index) => {
            channelName.classList.add('channel-style-' + index);
        });

    } catch (error) {
        console.error("Error fetching channels:", error);
    }
}



function collapseChannel(channelElement) {
    // Collapse the channel block
    channelElement.classList.remove('channel-block-expanded');
    // Collapse the channel name
    const channelName = channelElement.querySelector('.channel-name');
    if (channelName) {
        channelName.classList.remove('channel-name-expanded');
    }
    // Hide the descriptions
    const descriptions = channelElement.querySelectorAll('.schedule-video-description');
    descriptions.forEach(function(desc) {
        desc.style.display = 'none';
    });
    // Collapse the schedule
    const channelSchedule = channelElement.querySelector('.channel-schedule');
    if (channelSchedule) {
        channelSchedule.classList.remove('channel-schedule-expanded');
    }
    // Collapse the schedule items
    const scheduleItems = channelElement.querySelectorAll('.schedule-item');
    scheduleItems.forEach(function(item) {
        item.classList.remove('schedule-item-expanded');
    });
}


function getChannelInfo(channel, styleClass) {
    // console.log("video details", currentVideoDetails); 
    const videoInfoDiv = document.getElementById('channelInfo');
    // Display both the description and the bio of the channel
    videoInfoDiv.innerHTML = `
        <h3 id="nowPlayingTitle">Now Playing</h3>
        <h3 id="currChannelName">${channel.name}</h3>
        <div style="clear: both;"></div>
        <p id="currChannelBio"><strong></strong> ${channel.bio}</p>
        <p id="videoCast"><strong>Cast:</strong> ${currVideoCast || 'N/A'}</p>`;  

        const currChannelName = document.getElementById('currChannelName');
        currChannelName.className = '';
        currChannelName.classList.add(styleClass);
}


function getCurrentDayOfWeek() {
    return new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(new Date());
}


async function fetchScheduleForChannel(channelId) {
    const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const dayOfWeek = getCurrentDayOfWeek();
    try {
        const response = await fetch(`${API_BASE_URL}/schedules?channelId=${channelId}&dayOfWeek=${dayOfWeek}&timezone=${encodeURIComponent(userTimeZone)}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const schedule = await response.json();
        const convertedSchedules = schedule.map(item => ({
            ...item,
            start_time: convertToFullDateTime(item.start_time, userTimeZone),
            end_time: convertToFullDateTime(item.end_time, userTimeZone)
        }));
        channelSchedules[channelId] = convertedSchedules;
        createScheduleBlock(channelId, convertedSchedules);
    } catch (error) {
        console.error("Error fetching schedule:", error);
    }
}


function createScheduleBlock(channelId, maturityRating, channelName="default") {
    const scheduleBlock = document.createElement('div');
    scheduleBlock.className = 'channel-schedule';

    const displayedItems = channelSchedules[channelId] || [];
    let currentTime = new Date();

    // Filter schedules that haven't ended yet
    const relevantSchedules = displayedItems.filter(item => {
        const endTime = new Date(item.end_time);
        return endTime > currentTime;
    });

    // Limit the number of displayed items based on device width
    const limitedSchedules = relevantSchedules.slice(0, window.innerWidth <= 568 ? 2 : 4);

    // Calculate the total duration of these limited schedules in milliseconds
    const totalDurationMs = limitedSchedules.reduce((total, item) => {
        const start = new Date(item.start_time).getTime();
        const end = new Date(item.end_time).getTime();
        return total + (end - start);
    }, 0);

    limitedSchedules.forEach((item, index) => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'schedule-item';
        itemDiv.id = channelName;

        // Calculate this item's duration as a percentage of the total duration
        const start = new Date(item.start_time).getTime();
        const end = new Date(item.end_time).getTime();
        const itemDurationMs = end - start;
        const durationPercentage = (itemDurationMs / totalDurationMs) * 100;

        // Set the width (or height) of the item based on its duration percentage
        itemDiv.style.width = `${durationPercentage}%`;

        // Append child elements to itemDiv
        const titleDiv = document.createElement('div');
        titleDiv.className = 'schedule-title';
        titleDiv.id = channelName;
        titleDiv.textContent = item.title;
        itemDiv.appendChild(titleDiv);

        const maturityDiv = document.createElement('div');
        maturityDiv.className = 'schedule-maturity-rating';
        maturityDiv.id = channelName;
        maturityDiv.textContent = maturityRating;
        itemDiv.appendChild(maturityDiv);

        const timeDiv = document.createElement('div');
        timeDiv.className = index === 0 ? 'schedule-remaining-time' : 'schedule-time';
        timeDiv.id = channelName;

        if (index === 0) {
            // Show remaining time for the currently playing video
            const updateRemainingTime = () => {
                currentTime = new Date();
                const remainingTimeMs = end - currentTime.getTime();
                const remainingHours = Math.floor((remainingTimeMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                const remainingMinutes = Math.floor((remainingTimeMs % (1000 * 60 * 60)) / (1000 * 60));
                timeDiv.textContent = `${remainingHours}hr ${remainingMinutes}min left`;
            };

            updateRemainingTime(); // Initial call to set the remaining time
            setInterval(updateRemainingTime, 5000); // Update every second
        } else {
            // Show scheduled start and end times for upcoming videos
            const startTimeStr = new Date(item.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
            const endTimeStr = new Date(item.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
            timeDiv.textContent = `${startTimeStr} - ${endTimeStr}`;
        }

        itemDiv.appendChild(timeDiv);

        const descriptionDiv = document.createElement('div');
        descriptionDiv.className = 'schedule-video-description';
        descriptionDiv.id = channelName;
        descriptionDiv.textContent = item.description;
        descriptionDiv.style.display = 'none'; // Initially hidden
        itemDiv.appendChild(descriptionDiv);

        scheduleBlock.appendChild(itemDiv);
    });

    return scheduleBlock;
}






// function createScheduleBlock(channelId, maturityRating, channelName="default") {
//     const scheduleBlock = document.createElement('div');
//     scheduleBlock.className = 'channel-schedule';

//     const displayedItems = channelSchedules[channelId] || [];
//     const currentTime = new Date();

//     // Filter schedules that haven't ended yet
//     const relevantSchedules = displayedItems.filter(item => {
//         const endTime = new Date(item.end_time);
//         return endTime > currentTime;
//     });

//     // Limit the number of displayed items based on device width
//     const limitedSchedules = relevantSchedules.slice(0, window.innerWidth <= 568 ? 2 : 4);

//     // Calculate the total duration of these limited schedules in milliseconds
//     const totalDurationMs = limitedSchedules.reduce((total, item) => {
//         const start = new Date(item.start_time).getTime();
//         const end = new Date(item.end_time).getTime();
//         return total + (end - start);
//     }, 0);

//     limitedSchedules.forEach(item => {
//         const itemDiv = document.createElement('div');
//         itemDiv.className = 'schedule-item';
//         itemDiv.id = channelName;

//         // Calculate this item's duration as a percentage of the total duration
//         const start = new Date(item.start_time).getTime();
//         const end = new Date(item.end_time).getTime();
//         const itemDurationMs = end - start;
//         const durationPercentage = (itemDurationMs / totalDurationMs) * 100;

//         // Set the width (or height) of the item based on its duration percentage
//         itemDiv.style.width = `${durationPercentage}%`;

//         // Append child elements to itemDiv
//         const titleDiv = document.createElement('div');
//         titleDiv.className = 'schedule-title';
//         titleDiv.id = channelName;
//         titleDiv.textContent = item.title;
//         itemDiv.appendChild(titleDiv);

//         const maturityDiv = document.createElement('div');
//         maturityDiv.className = 'schedule-maturity-rating';
//         maturityDiv.id = channelName;
//         maturityDiv.textContent = maturityRating;
//         itemDiv.appendChild(maturityDiv);

//         const descriptionDiv = document.createElement('div');
//         descriptionDiv.className = 'schedule-video-description';
//         descriptionDiv.id = channelName;
//         descriptionDiv.textContent = item.description;
//         descriptionDiv.style.display = 'none'; // Initially hidden
//         itemDiv.appendChild(descriptionDiv);

//         scheduleBlock.appendChild(itemDiv);
//     });

//     return scheduleBlock;
// }


// function createScheduleBlock(channelId, maturityRating, channelName="default") {
//     const scheduleBlock = document.createElement('div');
//     scheduleBlock.className = 'channel-schedule';

//     const displayedItems = channelSchedules[channelId] || [];
    
//     // Get the current time and the time one hour from now
//     const currentTime = new Date();
//     const oneHourLater = new Date(currentTime.getTime() + (60 * 60 * 1000)); // Adds one hour in milliseconds

//     // Filter schedules to only those starting within the next hour
//     const itemsWithinNextHour = displayedItems.filter(item => {
//         const startTime = new Date(item.start_time);
//         return startTime >= currentTime && startTime <= oneHourLater;
//     });

//     // Calculate the total duration of filtered schedules in milliseconds
//     const totalDurationMs = itemsWithinNextHour.reduce((total, item) => {
//         const start = new Date(item.start_time).getTime();
//         const end = new Date(item.end_time).getTime();
//         return total + (end - start);
//     }, 0);


//     itemsWithinNextHour.forEach(item => {
//         const itemDiv = document.createElement('div');
//         itemDiv.className = 'schedule-item';
//         itemDiv.id = channelName;

//         // Calculate this item's duration as a percentage of the total duration
//         const start = new Date(item.start_time).getTime();
//         const end = new Date(item.end_time).getTime();
//         const itemDurationMs = end - start;
//         const durationPercentage = (itemDurationMs / totalDurationMs) * 100;

//         // Set the width (or height) of the item based on its duration percentage
//         itemDiv.style.width = `${durationPercentage}%`;

//         // Append child elements to itemDiv
//         const titleDiv = document.createElement('div');
//         titleDiv.className = 'schedule-title';
//         titleDiv.id = channelName;
//         titleDiv.textContent = item.title;
//         itemDiv.appendChild(titleDiv);

//         const maturityDiv = document.createElement('div');
//         maturityDiv.className = 'schedule-maturity-rating';
//         maturityDiv.id = channelName;
//         maturityDiv.textContent = maturityRating;
//         itemDiv.appendChild(maturityDiv);

//         const descriptionDiv = document.createElement('div');
//         descriptionDiv.className = 'schedule-video-description';
//         descriptionDiv.id = channelName;
//         descriptionDiv.textContent = item.description;
//         descriptionDiv.style.display = 'none'; // Initially hidden
//         itemDiv.appendChild(descriptionDiv);

//         scheduleBlock.appendChild(itemDiv);
//     });

//     return scheduleBlock;
// }






// async function fetchScheduleForChannel(channelId) {
//     const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

//     const dayOfWeek = getCurrentDayOfWeek();

//     try {
//         const response = await fetch(`${API_BASE_URL}/schedules?channelId=${channelId}&dayOfWeek=${dayOfWeek}&timezone=${encodeURIComponent(userTimeZone)}`);
//         if (!response.ok) {
//             throw new Error(`HTTP error! status: ${response.status}`);
//         }
//         const schedule = await response.json();
//         //console.log("schedule: ", schedule);
        
//         const currentTime = new Date();

//         // console.log("User Time Zone:", userTimeZone);

//         // Convert each schedule time to the user's local time zone
//         const convertedSchedules = schedule.map(item => ({
//             ...item,
//             start_time: convertToFullDateTime(item.start_time, userTimeZone),
//             end_time: convertToFullDateTime(item.end_time, userTimeZone)
//         }));

//         // Debugging: Print converted start times
//         // convertedSchedules.forEach(item => console.log("Converted Start Time:", item.start_time));

//         // Filter schedules that haven't ended yet and adjust number based on device width
//         const relevantSchedules = convertedSchedules
//             .filter(item => new Date(item.end_time) > currentTime)
//             .slice(0, window.innerWidth <= 568 ? 2 : 4);

//         channelSchedules[channelId] = relevantSchedules;
//         console.log("relevant schedules: ", relevantSchedules);
//         return relevantSchedules;
//     } catch (error) {
//         console.error("Error fetching schedule:", error);
//         return []; // Return an empty array in case of error
//     }
// }



// function createScheduleBlock(channelId, maturityRating, channelName="default") {
//     const scheduleBlock = document.createElement('div');
//     scheduleBlock.className = 'channel-schedule';

//     const displayedItems = channelSchedules[channelId] || [];

//     displayedItems.forEach(item => {
//         const itemDiv = document.createElement('div');
//         itemDiv.className = 'schedule-item';
//         itemDiv.id = channelName;
//         //console.log("item: ", item);

//         // Create a div for the title
//         const titleDiv = document.createElement('div');
//         titleDiv.className = 'schedule-title';
//         titleDiv.id = channelName;
//         titleDiv.textContent = item.title;
//         //console.log("titlediv: ", titleDiv.textContent);
//         itemDiv.appendChild(titleDiv);

//         // Create a div for the maturity rating
//         const maturityDiv = document.createElement('div');
//         maturityDiv.className = 'schedule-maturity-rating';
//         maturityDiv.id = channelName;
//         maturityDiv.textContent = maturityRating;
//         itemDiv.appendChild(maturityDiv);

//         // Create a div for the time
//         // const timeDiv = document.createElement('div');
//         // timeDiv.className = 'schedule-time';
//         // timeDiv.textContent = `${item.start_time} - ${item.end_time}`;
//         // itemDiv.appendChild(timeDiv);

//         // Create a div for video description
//         const descriptionDiv = document.createElement('div');
//         descriptionDiv.className = 'schedule-video-description';
//         descriptionDiv.id = channelName;
//         descriptionDiv.textContent = item.description;
//         descriptionDiv.style.display = 'none'; // Initially hidden
//         itemDiv.appendChild(descriptionDiv);

//         scheduleBlock.appendChild(itemDiv);
//     });

//     return scheduleBlock;
// }



function onYouTubeIframeAPIReady() {
    //checkForScheduledVideo();
    //loadVideo();
}


function selectChannel(channelId) {
    //console.log("Channel ID Selected:", channelId);
    selectedChannelId = channelId;
    clearInterval(checkForVideoInterval);
    checkForScheduledVideo(); 
}


function checkForScheduledVideo() {
    if (!selectedChannelId) {
        console.error('No channel selected');
        return;
    }
    const channelId = selectedChannelId;
    
    const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone; 
    checkForVideoInterval = setInterval(function() {
        fetch(`${API_BASE_URL}/videos`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ channelId: channelId, timezone: userTimeZone})
        })
        .then(response => response.json())
        .then(data => {
            // console.log("Data from server:", data);
            
            // console.log("start_time: ", data.startTime);

            // initialStartTime = convertTimeToTimezone(data.startTime, userTimeZone);
            // console.log("initial: ", initialStartTime);

            // initialEndTime = convertTimeToTimezone(data.endTime, userTimeZone);

            //console.log("returned data: ", data);
            scheduledStartTime = convertToFullDateTime(data.startTime, userTimeZone);
            scheduledEndTime = convertToFullDateTime(data.endTime, userTimeZone);
            const currentTime = new Date();
            console.log("start time", scheduledStartTime);
            console.log("end time: ", scheduledEndTime);
            console.log("currenttime: ", currentTime);
            
 
            if (currentTime.getTime() >= scheduledStartTime.getTime() && currentTime.getTime() < scheduledEndTime.getTime()) {
                console.log("entered interval");
                clearInterval(checkForVideoInterval);
                loadVideo(channelId);
            }
        })
        .catch(error => {
            console.error("Error fetching video data:", error);
        });
    }, 1000);
}


function convertTimeToTimezone(timeString, targetTimezone) {
    const currentDate = new Date().toISOString().slice(0, 10); // YYYY-MM-DD format
    const dateTimeString = `${currentDate}T${timeString}Z`; // Assuming timeString is in UTC for this example

    // Create a Date object in the local timezone based on the input UTC time
    const dateInUTC = new Date(dateTimeString);

    // Format the date in the target timezone
    const options = {
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        timeZone: targetTimezone, hour12: false
    };

    return new Intl.DateTimeFormat('en-US', options).format(dateInUTC);
}

  

async function getVideoCast(channelId) {
    const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone; 

    const dayOfWeek = getCurrentDayOfWeek();
    try {
        // Make a POST request to your endpoint that returns video details including the cast
        const response = await fetch(`${API_BASE_URL}/videos`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ channelId: channelId, timezone: userTimeZone, dayOfWeek: dayOfWeek})
        });

        // Check if the request was successful
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        const videoCast = data.video_cast;
        console.log("video cast: ", videoCast);

        // Update the global 'currVideoCast' variable
        currVideoCast = videoCast;

        updateCastUI(videoCast);

    } catch (error) {
        console.error("Error fetching video cast:", error);
    }
}

function updateCastUI(cast) {
    // Assuming you have an element with id 'videoCast' to display the cast
    const castElement = document.getElementById('videoCast');
    if (castElement) {
        castElement.innerHTML = `<strong>Cast:</strong> ${cast || 'N/A'}`;
    }
}



function checkForScheduledEnding() {
    //console.log("Checking for scheduled ending with:", currentVideoDetails);

    if (!currentVideoDetails || !currentVideoDetails.endTime) {
        console.error('No current video details available');
        return;
    }

    checkForVideoInterval = setInterval(function() {
        const currentTime = new Date();
        // console.log(currentVideoDetails.endTime);
        if (currentTime.getTime() >= currentVideoDetails.endTime.getTime()) {
            clearInterval(checkForVideoInterval);
            // fetchNextVideoAndLoad(currentVideoDetails.channelId);
            fetchChannels();
            loadVideo(currentVideoDetails.channelId);
        }
    }, 1000); // Check every 1 second
}



function loadVideo(channelId) {
    isLoading = true;
    const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    fetch(`${API_BASE_URL}/videos`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ channelId: channelId, timezone: userTimeZone })
    })
    .then(response => response.json())
    .then(data => {
        console.log("loaded video: ", data);

        // const initialStart = convertTimeToTimezone(data.startTime, userTimeZone);
        // const initialEnd = convertTimeToTimezone(data.endTime, userTimeZone);

        // console.log("initial start: ", initialStart);

        scheduledStartTime = convertToFullDateTime(data.startTime, userTimeZone);
        scheduledEndTime = convertToFullDateTime(data.endTime, userTimeZone);

        const currentTime = new Date();
        const timeElapsed = (currentTime - scheduledStartTime) / 1000;
        const initialStartTime = parseInt(extractStartTime(data.embedUrl));
        const startTimes = initialStartTime + timeElapsed;

        currentVideoDetails = {
            channelId: channelId,
            startTime: scheduledStartTime,
            endTime: scheduledEndTime,
            videoId: extractVideoID(data.embedUrl),
        };

        if (!player) {
            player = new YT.Player('videoPlayer', {
                videoId: extractVideoID(data.embedUrl),
                playerVars: {
                    controls: 0,
                    autoplay: 1,
                    mute: 1,
                    start: startTimes,
                    disablekb: 1,
                    modestbranding: 1
                },
                events: {
                    'onReady': function(event) {
                        // Once the player is ready, apply startSeconds parameter
                        event.target.loadVideoById({
                            videoId: extractVideoID(data.embedUrl),
                            startSeconds: startTimes
                        });
                    },
                    'onStateChange': onPlayerStateChange
                }
            });
        } else {
            player.loadVideoById({
                videoId: extractVideoID(data.embedUrl),
                startSeconds: startTimes
            });
        }

        getVideoCast(channelId);
        checkForScheduledEnding();
    })
    .catch(error => {
        console.error("Error fetching video data:", error);
        isLoading = false;
    });
}


function convertToFullDateTime(timeString, timeZone) {
    // Assuming moment and moment-timezone libraries are imported

    // Get the current date in the local timezone
    const today = moment();

    // Combine the current date with the input timeString
    // Assuming timeString is in "HH:mm:ss" format
    const dateTimeString = today.format('YYYY-MM-DD') + ' ' + timeString;

    // Parse the dateTimeString in the local timezone, then convert it to the target timezone
    const convertedDate = moment.tz(dateTimeString, "YYYY-MM-DD HH:mm:ss", moment.tz.guess()).tz(timeZone);

    // Return the Date object of the converted date
    return convertedDate.toDate();
}



function onPlayerReady(event) {
    event.target.playVideo();

    const muteButtonIcon = document.querySelector('.mute-toggle i');
    if (muteButtonIcon) {
        muteButtonIcon.classList.remove('fa-volume-up');
        muteButtonIcon.classList.add('fa-volume-mute');
    }
}


function onPlayerStateChange(event) {
    if (event.data == YT.PlayerState.ENDED) {
        //console.log("Video ended. Loading next scheduled video if available.");
        //fetchChannels();
        updateNewSchedule(selectedChannelId);
        checkForScheduledVideo();
    }
    else if (event.data == YT.PlayerState.PLAYING) {
        isLoading = false; 
    }
}


// updates the schedule display after each video 
function updateNewSchedule(channelId) { 
    // Remove the first item and fetch the next upcoming video
    channelSchedules[channelId].shift(); // Remove the first element
    fetchScheduleForChannel(channelId).then(() => {
        const channelBlock = document.querySelector(`[data-channel-id="${channelId}"]`);
        if (channelBlock) {
            // Replace the old schedule block with the new one
            const oldScheduleBlock = channelBlock.querySelector('.channel-schedule');
            if (oldScheduleBlock) {
                oldScheduleBlock.remove();
            }
            const newScheduleBlock = createScheduleBlock(channelId, channelBlock.dataset.maturityRating);
            channelBlock.appendChild(newScheduleBlock);
        }
    });
}



function extractVideoID(url) {
    const regex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    return (url.match(regex)) ? RegExp.$1 : null;
}

function extractStartTime(url) {
    // console.log('URL received in extractStartTime:', url);
    const regex = /[?&]start=(\d+)/;
    const match = url.match(regex);
    //console.log('Match result:', match);
    return match ? match[1] : '0';
}

function toggleMute() {
    if (player.isMuted()) {
        player.unMute();
        document.querySelector('.mute-toggle i').classList.remove('fa-volume-mute');
        document.querySelector('.mute-toggle i').classList.add('fa-volume-up');
    } else {
        player.mute();
        document.querySelector('.mute-toggle i').classList.remove('fa-volume-up');
        document.querySelector('.mute-toggle i').classList.add('fa-volume-mute');
    }
}


function toggleMute() {
    if (player) {
        if (player.isMuted()) {
            player.unMute();
            document.querySelector('.mute-toggle i').classList.replace('fa-volume-mute', 'fa-volume-up');
        } else {
            player.mute();
            document.querySelector('.mute-toggle i').classList.replace('fa-volume-up', 'fa-volume-mute');
        }
    }
}



// Save volume to localStorage
function saveVolume(volume) {
    localStorage.setItem('userVolume', volume);
}

// Load volume from localStorage
function loadVolume() {
    var volume = localStorage.getItem('userVolume');
    if (volume !== null) {
        document.getElementById('volumeSlider').value = volume;
        player.setVolume(volume);
    }
}



document.querySelector('.mute-toggle').addEventListener('click', toggleMute);


// Update volume control and player volume when the slider is adjusted
document.getElementById('volumeSlider').addEventListener('input', function() {
    var volume = this.value;
    player.setVolume(volume);
    if (volume == 0) {
        document.querySelector('.mute-toggle i').classList.replace('fa-volume-up', 'fa-volume-mute');
    } else {
        document.querySelector('.mute-toggle i').classList.replace('fa-volume-mute', 'fa-volume-up');
    }
});


function setInitialVolume() {
    var initialVolume = document.getElementById('volumeSlider').value;
    if (player && initialVolume) {
        player.setVolume(initialVolume);
    }
}


function scheduleNextUpdate() {
    // Calculate the delay until the next 15-minute mark
    const now = moment();
    const nextQuarterHour = now.clone().add(15 - (now.minute() % 15), 'minutes').startOf('minute');
    const delay = nextQuarterHour.diff(now);

    // Schedule the first update
    setTimeout(() => {
        updateTimeIntervals(); // Update at the next 15-minute mark
        setInterval(updateTimeIntervals, 15 * 60 * 1000); // Continue updating every 15 minutes
    }, delay);
}


function updateCurrentTime() {
    const now = moment.tz(moment.tz.guess());
    const currentTime = now.format('hh:mm A');

    const channelBar = document.getElementById('channelBar');
    const display = channelBar.querySelector('.displays');

    if (display) {
        display.textContent = `Now: ${currentTime}`;
    }
}

// Call updateCurrentTime immediately to set the initial time
updateCurrentTime();

// Set an interval to update the time every minute (60000 milliseconds)
setInterval(updateCurrentTime, 5000);

// function updateTimeIntervals() {
//     const now = moment.tz(moment.tz.guess());
//     let currentIntervalTime = now.clone().subtract(now.minute() % 15, 'minutes').seconds(0).milliseconds(0);

//     const channelBar = document.getElementById('channelBar');
//     const displays = channelBar.getElementsByClassName('displays');

//     for (let i = 0; i < displays.length; i++) {
//         let displayTime = currentIntervalTime.format('hh:mm A');
//         displays[i].textContent = displayTime;
//         currentIntervalTime.add(15, 'minutes');
//     }
// }



document.addEventListener("DOMContentLoaded", function() {

    onYouTubeIframeAPIReady();
    //selectChannel(9);
    
    // fetchChannels();
    // getVideoCast(9);
    fetchChannels().then(() => {
        selectChannel(26);
        getVideoCast(26);
        
    });
    defaultVideo();

    const fullscreenBtn = document.querySelector('.fullscreen-toggle'); 
    //const videoContainer = document.querySelector('#videoContainer');
    
    // fullscreenBtn.addEventListener('click', () => {
    //   if (!document.fullscreenElement) {
    //     videoContainer.requestFullscreen().then(() => {
    //         videoContainer.classList.add('fullscreen-mode'); 
    //     }).catch(err => {
    //       console.error(`Error attempting to enable fullscreen mode: ${err.message}`);
    //     });
    //   } else {
    //     if (document.exitFullscreen) {
    //       document.exitFullscreen(); 
    //     }
    //   }
    // });

    fullscreenBtn.addEventListener('click', toggleFullscreen);

    fullscreenBtn.addEventListener('touchstart', function(event) {
        event.preventDefault(); 
        toggleFullscreen();
    });


    

    const muteButtonIcon = document.querySelector('.mute-toggle i');
    if (muteButtonIcon) {
        muteButtonIcon.classList.remove('fa-volume-up');
        muteButtonIcon.classList.add('fa-volume-mute');
    }

    updateTimeIntervals(); // Initialize the time intervals
    scheduleNextUpdate();

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange); // Safari

   
});


function handleFullscreenChange() {
    const videoContainer = document.querySelector('#videoContainer');
    if (!document.fullscreenElement && !document.webkitFullscreenElement) {
        videoContainer.classList.remove('fullscreen-mode');
        adjustVideoForOrientation(); // Ensure you call adjustVideoForOrientation function correctly
    }
}

function toggleFullscreen() {
    const videoContainer = document.querySelector('#videoContainer');

    // Check if we're in fullscreen mode (either via the API or our fallback)
    const isInFullscreen = document.fullscreenElement || videoContainer.classList.contains('fullscreen-fallback');

    if (!isInFullscreen) {
        // Attempt to use the Fullscreen API first
        if (videoContainer.requestFullscreen) {
            videoContainer.requestFullscreen();
            // .catch(err => {
            //     console.error(`Error attempting to enable fullscreen mode: ${err.message}`);
            //     // Fallback to fullscreen simulation if Fullscreen API fails
            //     videoContainer.classList.add('fullscreen-fallback');
            // });
        } else if (videoContainer.webkitRequestFullscreen) { // Safari
            videoContainer.webkitRequestFullscreen();
            // .catch(err => {
            //     console.error(`Error attempting to enable fullscreen mode: ${err.message}`);
            //     videoContainer.classList.add('fullscreen-fallback');
            // });
        } else {
            // If Fullscreen API is not available, use the fallback
            videoContainer.classList.add('fullscreen-fallback');
        }
    } else {
        // Exiting fullscreen
        if (document.exitFullscreen) {
            document.exitFullscreen().catch(() => {
                videoContainer.classList.remove('fullscreen-fallback');
            });
        } else if (document.webkitExitFullscreen) { // Safari
            document.webkitExitFullscreen().catch(() => {
                videoContainer.classList.remove('fullscreen-fallback');
            });
        } else {
            // Remove fallback class if Fullscreen API is not available
            videoContainer.classList.remove('fullscreen-fallback');
        }
    }
}



// function toggleFullscreen() {
//     const videoContainer = document.querySelector('#videoContainer');
//     if (!document.fullscreenElement && !document.webkitFullscreenElement) { // webkit prefix for Safari
//         if (videoContainer.requestFullscreen) {
//             videoContainer.requestFullscreen();
//         } else if (videoContainer.webkitRequestFullscreen) { // Safari
//             videoContainer.webkitRequestFullscreen();
//         }
//     } else {
//         if (document.exitFullscreen) {
//             document.exitFullscreen();
//         } else if (document.webkitExitFullscreen) { // Safari
//             document.webkitExitFullscreen();
//         }
//     }
// }


window.addEventListener('resize', adjustVideoForOrientation);
document.addEventListener('fullscreenchange', function () {
    const videoContainer = document.querySelector('#videoContainer');
    if (!document.fullscreenElement) {
        // Remove fullscreen-specific classes
        videoContainer.classList.remove('fullscreen-mode');
        adjustVideoForOrientation(); 
    }
});


function adjustVideoForOrientation() {
    const videoContainer = document.querySelector('#videoContainer');
    if (window.innerHeight > window.innerWidth) {
      // Portrait orientation
      videoContainer.classList.add('fullscreen-portrait');
    } else {
      // Landscape orientation
      videoContainer.classList.remove('fullscreen-portrait');
    }
  } 
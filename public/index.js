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
    if (currentlyExpandedChannel && currentlyExpandedChannel !== element) {
        collapseChannel(currentlyExpandedChannel);
    }

    await fetchChannelDetails(channel.channel_id);

    getVideoCast(channel.channel_id);
    selectChannel(channel.channel_id); // triggers the video change

    //console.log("cast", currVideoCast); 

    element.classList.toggle('channel-block-expanded');

    // expanding the channe name block when user clicks on it
    const channelName = element.querySelector('.channel-name');
    if (channelName) {
        channelName.classList.toggle('channel-name-expanded');
    }

    // make description visible
    const descriptions = element.querySelectorAll('.schedule-video-description');
    descriptions.forEach(function(desc) {
        desc.style.display = desc.style.display === 'none' ? 'block' : 'none';
    });

    // expanding the channel schedule block when user clicks on it
    const channelSche = element.querySelector('.channel-schedule');
    if(channelSche){
        channelSche.classList.toggle('channel-schedule-expanded');
    }
    

    // expand the schedule padding when clicked on
    const scheduleItems = element.querySelectorAll('.schedule-item');
    scheduleItems.forEach(function(item) {
        item.classList.toggle('schedule-item-expanded');
    });
    
    getChannelInfo(channel, element.dataset.styleClass);
    currentlyExpandedChannel = element.classList.contains('channel-block-expanded') ? element : null;
}


async function fetchChannelDetails(channelId) {
    try {
        const response = await fetch(`${API_BASE_URL}/channel/${channelId}`);
        if (!response.ok) {
            console.log(`Cache hit for channel ${channelId}`);
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const channelDetails = await response.json();
        // console.log("channel details: ", channelDetails);
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
        // const response = await fetch(`${API_BASE_URL}/channels`); 
        // const channels = await response.json();
        const channels = await fetchChannelsWithCaching();
        const grid = document.getElementById('channelsGrid');
        grid.innerHTML = '';

        for (const [index, channel] of channels.entries()) {
            // const channelBlock = document.createElement('div');
            // channelBlock.id = channel.name
            // channelBlock.className = 'channel-block';
            // channelBlock.dataset.styleClass = 'channel-style-' + index;
            //selectChannel(channel.channel_id);

            if (index === 8) {
                // selectChannel(channel.channel_id);
                getChannelInfo(channel, 'channel-style-' + index);
            }
        }
    } catch (error) {
        console.error("Error fetching channels:", error);
    }

    localStorage.setItem('defaultVideoCalled', 'true');
}

async function fetchChannels() {
    try {
        // const response = await fetch(`${API_BASE_URL}/channels`); 
        // const channels = await response.json();
        const channels = await fetchChannelsWithCaching();
        const grid = document.getElementById('channelsGrid');
        grid.innerHTML = ''; // Clear the grid before adding new channels
        
        // const channel of channels
        for (const [index, channel] of channels.entries()) {
            const channelBlock = document.createElement('div');
            channelBlock.className = 'channel-block';
            channelBlock.id = channel.name
            channelBlock.dataset.styleClass = 'channel-style-' + index;
            //selectChannel(channel.channel_id);


            channelBlock.onclick = debounce(function() {

                channelSelectionHandler(channel, channelBlock);

                // if (currentlyExpandedChannel && currentlyExpandedChannel !== this) {
                //     collapseChannel(currentlyExpandedChannel);
                // }

                
                // getVideoCast(channel.channel_id);
                // selectChannel(channel.channel_id); // triggers the video change

                // //console.log("cast", currVideoCast); 

                // this.classList.toggle('channel-block-expanded');

                // // expanding the channe name block when user clicks on it
                // const channelName = this.querySelector('.channel-name');
                // if (channelName) {
                //     channelName.classList.toggle('channel-name-expanded');
                // }

                // // make description visible
                // const descriptions = this.querySelectorAll('.schedule-video-description');
                // descriptions.forEach(function(desc) {
                //     desc.style.display = desc.style.display === 'none' ? 'block' : 'none';
                // });

                // // expanding the channel schedule block when user clicks on it
                // const channelSche = this.querySelector('.channel-schedule');
                // if(channelSche){
                //     channelSche.classList.toggle('channel-schedule-expanded');
                // }
                
                

                // // expand the schedule padding when clicked on
                // const scheduleItems = this.querySelectorAll('.schedule-item');
                // scheduleItems.forEach(function(item) {
                //     item.classList.toggle('schedule-item-expanded');
                // });
                
                // getChannelInfo(channel, this.dataset.styleClass);
                // currentlyExpandedChannel = this.classList.contains('channel-block-expanded') ? this : null;

            }, 300);


            // Channel Content container
            const channelContent = document.createElement('div');
            channelContent.className = 'channel-content';
            channelContent.id = channel.name


            // Channel Name
            const nameofChannel = channel.name.split(" ");

            const channelName = document.createElement('div');
            channelName.className = 'channel-name';
            nameofChannel.forEach(word =>{
                const wordSpan = document.createElement('div');
                wordSpan.textContent = word;
                wordSpan.className = 'name-of-channel';
                wordSpan.id = channel.name
                //channelName.classList.add('channel-style-' + index);
                channelName.appendChild(wordSpan);
            });
            //channelName.textContent = channel.name;
            channelContent.appendChild(channelName);


            // Channel Schedule
            const schedule = await fetchScheduleForChannel(channel.channel_id); 
            // console.log('Schedule for channel', schedule);
            //const scheduleBlock = createScheduleBlock(schedule, channel.maturity_rating); 
            const scheduleBlock = createScheduleBlock(channel.channel_id, channel.maturity_rating, channel.name);
            channelContent.appendChild(scheduleBlock);

            channelBlock.appendChild(channelContent);

            grid.appendChild(channelBlock);
        }

        const channelNames = document.querySelectorAll('.channel-name');
        channelNames.forEach((channelName, index) => {
            // Assign a class based on the index or other data
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


async function fetchScheduleForChannel(channelId) {
    const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    try {
        const response = await fetch(`${API_BASE_URL}/schedules?channelId=${channelId}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const schedule = await response.json();
        
        const currentTime = new Date();

        // console.log("User Time Zone:", userTimeZone);

        // Convert each schedule time to the user's local time zone
        const convertedSchedules = schedule.map(item => ({
            ...item,
            start_time: convertToFullDateTime(item.start_time, userTimeZone),
            end_time: convertToFullDateTime(item.end_time, userTimeZone)
        }));

        // Debugging: Print converted start times
        // convertedSchedules.forEach(item => console.log("Converted Start Time:", item.start_time));

        // Filter schedules that haven't ended yet and adjust number based on device width
        const relevantSchedules = convertedSchedules
            .filter(item => new Date(item.end_time) > currentTime)
            .slice(0, window.innerWidth <= 568 ? 2 : 4);

        channelSchedules[channelId] = relevantSchedules;
        return relevantSchedules;
    } catch (error) {
        console.error("Error fetching schedule:", error);
        return []; // Return an empty array in case of error
    }
}



function createScheduleBlock(channelId, maturityRating, channelName="default") {
    const scheduleBlock = document.createElement('div');
    scheduleBlock.className = 'channel-schedule';

    const displayedItems = channelSchedules[channelId] || [];

    displayedItems.forEach(item => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'schedule-item';
        itemDiv.id = channelName;

        // Create a div for the title
        const titleDiv = document.createElement('div');
        titleDiv.className = 'schedule-title';
        titleDiv.id = channelName;
        titleDiv.textContent = item.title;
        itemDiv.appendChild(titleDiv);

        // Create a div for the maturity rating
        const maturityDiv = document.createElement('div');
        maturityDiv.className = 'schedule-maturity-rating';
        maturityDiv.id = channelName;
        maturityDiv.textContent = maturityRating;
        itemDiv.appendChild(maturityDiv);

        // Create a div for the time
        // const timeDiv = document.createElement('div');
        // timeDiv.className = 'schedule-time';
        // timeDiv.textContent = `${item.start_time} - ${item.end_time}`;
        // itemDiv.appendChild(timeDiv);

        // Create a div for video description
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

            console.log("returned data: ", data);
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
    try {
        // Make a POST request to your endpoint that returns video details including the cast
        const response = await fetch(`${API_BASE_URL}/videos`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ channelId: channelId, timezone: userTimeZone})
        });

        // Check if the request was successful
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        const videoCast = data.video_cast;

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

document.getElementById('fullscreenBtn').addEventListener('click', function() {
    var videoContainer = document.getElementById('videoContainer');
    if (videoContainer.requestFullscreen) {
        videoContainer.requestFullscreen();
    } else if (videoContainer.mozRequestFullScreen) { /* Firefox */
        videoContainer.mozRequestFullScreen();
    } else if (videoContainer.webkitRequestFullscreen) { /* Chrome, Safari & Opera */
        videoContainer.webkitRequestFullscreen();
    } else if (videoContainer.msRequestFullscreen) { /* IE/Edge */
        videoContainer.msRequestFullscreen();
    }
});



// cache the requests sent to backend
async function fetchChannelsWithCaching() {

    const cachedChannels = localStorage.getItem('channels');
    if (cachedChannels) {
        console.log("cached channels: ", cachedChannels);
        return JSON.parse(cachedChannels); // Return the cached channels
    }

    // If not cached, fetch from the server
    try {
        const response = await fetch(`${API_BASE_URL}/channels`);
        const channels = await response.json();
        // Cache the channels in local storage
        localStorage.setItem('channels', JSON.stringify(channels));
        const cachedChannels = JSON.parse(localStorage.getItem('channels'));
        console.log("cached: ", cachedChannels);
        return channels;
    } catch (error) {
        console.error("Error fetching channels:", error);
    }
}


document.addEventListener("DOMContentLoaded", function() {
    onYouTubeIframeAPIReady();
    selectChannel(9);
    defaultVideo();
    fetchChannels();
    getVideoCast(9);
    // loadVolume();
    // setInitialVolume();

    const muteButtonIcon = document.querySelector('.mute-toggle i');
    if (muteButtonIcon) {
        muteButtonIcon.classList.remove('fa-volume-up');
        muteButtonIcon.classList.add('fa-volume-mute');
    }
});

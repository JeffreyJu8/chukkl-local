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
    : 'https://www.chukkl.com';


    window.onload = async function() {
        try {
            const response = await fetch('/api/check-login', {
                credentials: 'include'
            });
            const data = await response.json();
    
            if (data.isLoggedIn) {
                document.getElementById('loginButton').style.display = 'none';
                document.getElementById('registerButton').style.display = 'none';
                document.getElementById('signOutButton').style.display = 'block';
            } else {
                document.getElementById('loginButton').style.display = 'block';
                document.getElementById('registerButton').style.display = 'block';
                document.getElementById('signOutButton').style.display = 'none';
            }
        } catch (error) {
            console.error('Error checking login status:', error);
        }
    };
    


document.getElementById('signOutButton').addEventListener('click', async function(event) {
    event.preventDefault();

    try {
        const response = await fetch('/signout', { method: 'POST' });
        if (response.ok) {
            window.location.href = '/kids';  // Redirect to the homepage or login page
        } else {
            console.error('Failed to sign out');
        }
    } catch (error) {
        console.error('Error signing out:', error);
    }
});


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
    console.log("Channel selection handler called");
    // if (isLoading) return; 
    isLoading = true; 

    if (currentlyExpandedChannel && currentlyExpandedChannel !== element) {
        collapseChannel(currentlyExpandedChannel);
    }

    try {
        
        await fetchChannelDetails(channel.channel_id);
        await getVideoCast(channel.channel_id); 
        selectChannel(channel.channel_id); 

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
        castElement.innerHTML = `<strong>Cast:</strong> ${details.people || 'N/A'}`;
    }
}


async function defaultVideo(){

    try {
        const response = await fetch(`${API_BASE_URL}/channels`); 
        const channels = await response.json();
        // const limitedChannels = channels.slice(25, 50);
        const grid = document.getElementById('channelsGrid');
        grid.innerHTML = '';
        // console.log("kids channels: ", limitedChannels);

        for (const [index, channel] of channels.entries()) {
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
        console.log("Response received:", response); // Log the entire response object
        const channels = await response.json();
        console.log("Parsed channels:", channels); // Log the parsed JSON

        // Log the length of channels to see if you have valid data
        if (channels.length === 0) {
            console.error("No channels received from backend.");
            return;
        }

        console.log("Channels to display:", channels);

        // Grab only the first 25 channels
        // const limitedChannels = channels.slice(25, 50);
        // console.log("Limited channels to display:", limitedChannels);

        const grid = document.getElementById('channelsGrid');
        grid.innerHTML = ''; // Clear the grid before adding new channels

        for (const [index, channel] of channels.entries()) {
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

            // Fetch and append the channel schedule
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


function selectChannel(channelId) {
    console.log("Channel ID Selected:", channelId);
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
        console.log("Loaded video data:", data);
    
        if (!data.embedUrl) {
            console.error("Error: No Vimeo URL provided by the backend.");
            return;
        }

        // Convert startTime and endTime to Date objects with time zone
        scheduledStartTime = convertToFullDateTime(data.startTime, userTimeZone);
        scheduledEndTime = convertToFullDateTime(data.endTime, userTimeZone);

        console.log("Scheduled start time:", scheduledStartTime);
        console.log("Scheduled end time:", scheduledEndTime);

        // Get the current time and calculate elapsed time since the start
        const currentTime = new Date();
        const timeElapsed = (currentTime - scheduledStartTime) / 1000;
        console.log("Time elapsed:", timeElapsed);

        // Log the embed URL to ensure it has a valid 'start' parameter
        console.log("Embed URL:", data.embedUrl);

        // Extract the initial start time from the embed URL (if applicable)
        const initialStartTime = 0;  
        console.log("Initial start time from embed URL:", initialStartTime);

        // Calculate the final start time to use for the video
        const startTimes = initialStartTime + timeElapsed;
        console.log("Calculated start time for video:", startTimes);

        // currentVideoDetails = {
        //     channelId: channelId,
        //     startTime: scheduledStartTime,
        //     endTime: scheduledEndTime,
        //     vimeoUrl: data.embedUrl,
        // };

        console.log("About to call loadRestrictedVimeoVideo with:");
        loadRestrictedVimeoVideo(data.embedUrl, startTimes);
        console.log("Called loadRestrictedVimeoVideo");
        // updateCastUI(data.people);
        checkForScheduledEnding();
    })
    .catch(error => {
        console.error("Error fetching video data:", error);
        isLoading = false;
    });
}


function loadRestrictedVimeoVideo(vimeoUrl, timeElapsed) {
    console.log("vimeo start: ", timeElapsed)
    const playerDiv = document.getElementById('videoContainer');
    
    // Get dynamic width and height of the video player container
    const updatePlayerDimensions = () => ({
        width: playerDiv.clientWidth,
        height: playerDiv.clientHeight
    });

    const playerOptions = {
        url: vimeoUrl,
        responsive: false,
        autoplay: true,
        muted: true, // Ensure muted autoplay works across browsers
        keyboard: false,
        controls: true,
        background: false,
        dnt: true,
        ...updatePlayerDimensions()
    };

    // Initialize or update Vimeo player
    if (!window.player) {
        window.player = new Vimeo.Player(playerDiv, playerOptions);

        // Listen for the 'loaded' event once
        window.player.once('loaded', function() {
            window.player.setCurrentTime(timeElapsed).then(() => {
                window.player.play();
            }).catch((error) => {
                console.error("Error setting video start time:", error);
            });
        });
    } else {
        window.player.loadVideo(vimeoUrl).then(() => {
            const { width, height } = updatePlayerDimensions();
            window.player.setWidth(width);
            window.player.setHeight(height);

            // Set the current time and play the video directly
            window.player.setCurrentTime(timeElapsed).then(() => {
                
                window.player.play();
            }).catch((error) => {
                console.error("Error setting video start time:", error);
            });
        }).catch((error) => {
            console.error("Error loading video:", error);
        });
    }

    // Listen for time updates and store the last time
    window.player.on('timeupdate', function(event) {
        const currentTime = event.seconds;
        window.player.lastTime = currentTime;
    });

    // Ensure video resumes on pause (autoplay handling)
    window.player.on('pause', function() {
        window.player.play();
    });
}




// Debounce function to optimize resize event handler
function debounce(func, wait) {
    let timeout;
    return function() {
        clearTimeout(timeout);
        timeout = setTimeout(func, wait);
    };
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

function updateTimeIntervals() {
    const now = moment.tz(moment.tz.guess());
    let currentIntervalTime = now.clone().subtract(now.minute() % 15, 'minutes').seconds(0).milliseconds(0);

    const channelBar = document.getElementById('channelBar');
    const displays = channelBar.getElementsByClassName('displays');

    for (let i = 0; i < displays.length; i++) {
        let displayTime = currentIntervalTime.format('hh:mm A');
        displays[i].textContent = displayTime;
        currentIntervalTime.add(15, 'minutes');
    }
}


async function checkLoginStatus() {
    console.log('Checking login status...');
    const token = localStorage.getItem('debughoney:core-sdk:*token');
    console.log('Token retrieved from localStorage:', token);
    
    if (!token) {
        console.error('No token found in localStorage');
        // Redirect to login page or handle accordingly
        // window.location.href = '/login';
        // return;
    } else {
        console.log('Token found, proceeding to verify...');
    }

    try {
        const response = await fetch(`${API_BASE_URL}/verify-token`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
    
        console.log('Verify token response status:', response.status);
    
        if (response.ok) {
            const result = await response.json();
            console.log('Token verification successful, user:', result.user);

            // **Set the token in localStorage again (if you need to refresh it or update it)**
            if (result.token) {
                localStorage.setItem('debughoney:core-sdk:*token', result.token); 
                console.log('Updated token stored in localStorage:', localStorage.getItem('debughoney:core-sdk:*token'));
            }

            // Update the UI for a logged-in user
            updateUIForLoggedInUser(result.user);

        } else {
            console.error('Token verification failed');
            // localStorage.removeItem('debughoney:core-sdk:*token');
            // Redirect to login page
            // window.location.href = '/login';
        }
    } catch (error) {
        console.error('Error verifying token:', error);
        // localStorage.removeItem('debughoney:core-sdk:*token');
        // Redirect to login page
        // window.location.href = '/login';
    }
}


function updateUIForLoggedInUser(user) {
    document.getElementById('loginButton').style.display = 'none';
    document.getElementById('registerButton').style.display = 'none';
    document.getElementById('signOutButton').style.display = 'inline-block';
}

function updateUIForLoggedOutUser() {
    document.getElementById('loginButton').style.display = 'inline-block';
    document.getElementById('registerButton').style.display = 'inline-block';
    document.getElementById('signOutButton').style.display = 'none';
}


document.addEventListener("DOMContentLoaded", function() {
    const signOutButton = document.getElementById('signOutButton');
    if (signOutButton) {
        signOutButton.addEventListener('click', async function(event) {
            event.preventDefault();
            localStorage.removeItem('debughoney:core-sdk:*token');
            updateUIForLoggedOutUser();
            window.location.href = `${API_BASE_URL}/login`; 
        });
    }

    // matchChannelInfoHeight()

    checkLoginStatus();

    //selectChannel(9);
    
    // fetchChannels();
    // getVideoCast(9);
    fetchChannels().then(() => {
        selectChannel(1);
        getVideoCast(1);
        
    });
    defaultVideo();

    updateTimeIntervals(); 
    scheduleNextUpdate();
});
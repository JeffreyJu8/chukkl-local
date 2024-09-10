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
    : 'https://chukkl.com';


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
            // updateUIForLoggedInUser(result.user);

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
    document.getElementById('welcomeMessage').textContent = `Welcome, ${user.email}`;
    document.getElementById('personalizedContent').style.display = 'block';
    document.getElementById('genericContent').style.display = 'none';
}

function updateUIForLoggedOutUser() {
    document.getElementById('loginButton').style.display = 'inline-block';
    document.getElementById('registerButton').style.display = 'inline-block';
    document.getElementById('signOutButton').style.display = 'none';
    // Show generic content
    document.getElementById('welcomeMessage').textContent = '';
    document.getElementById('personalizedContent').style.display = 'none';
    document.getElementById('genericContent').style.display = 'block';
}


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
    if (isLoading) return; 
    isLoading = true; // Set loading state to true

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
        
    } finally {
        isLoading = false; // Reset loading state
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
        grid.innerHTML = ''; 

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

    const totalDurationMs = limitedSchedules.reduce((total, item) => {
        const start = new Date(item.start_time).getTime();
        const end = new Date(item.end_time).getTime();
        return total + (end - start);
    }, 0);

    limitedSchedules.forEach((item, index) => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'schedule-item';
        itemDiv.id = channelName;

        const start = new Date(item.start_time).getTime();
        const end = new Date(item.end_time).getTime();
        const itemDurationMs = end - start;
        const durationPercentage = (itemDurationMs / totalDurationMs) * 100;

        itemDiv.style.width = `${durationPercentage}%`;

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

        // Time display
        if (index === 0) {
            const updateRemainingTime = () => {
                currentTime = new Date();
                const remainingTimeMs = end - currentTime.getTime();
                const remainingHours = Math.floor((remainingTimeMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                const remainingMinutes = Math.floor((remainingTimeMs % (1000 * 60 * 60)) / (1000 * 60));
                timeDiv.textContent = `${remainingHours}hr ${remainingMinutes}min left`;
            };

            updateRemainingTime();
            setInterval(updateRemainingTime, 5000); 
        } else {
            const startTimeStr = new Date(item.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
            const endTimeStr = new Date(item.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
            timeDiv.textContent = `${startTimeStr} - ${endTimeStr}`;
        }

        itemDiv.appendChild(timeDiv);

        const descriptionDiv = document.createElement('div');
        descriptionDiv.className = 'schedule-video-description';
        descriptionDiv.id = channelName;
        descriptionDiv.textContent = item.description;
        descriptionDiv.style.display = 'none'; 
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
    const dateTimeString = `${currentDate}T${timeString}Z`;

    const dateInUTC = new Date(dateTimeString);

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
        const response = await fetch(`${API_BASE_URL}/videos`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ channelId: channelId, timezone: userTimeZone, dayOfWeek: dayOfWeek})
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        const videoCast = data.video_cast;
        console.log("video cast: ", videoCast);

        currVideoCast = videoCast;

        updateCastUI(videoCast);

    } catch (error) {
        console.error("Error fetching video cast:", error);
    }
}

function updateCastUI(cast) {
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
            videoId: extractVimeoID(data.embedUrl),
        };

        if (!player) {
            player = new Vimeo.Player('videoPlayer', {
                id: extractVimeoID(data.embedUrl),
                autopause: false,
                autoplay: true,
                muted: true,
                start: startTimes
            });

            player.on('loaded', function() {
                player.setCurrentTime(startTimes);
            });

            player.on('ended', onPlayerStateChange);
        } else {
            player.loadVideo(extractVimeoID(data.embedUrl)).then(function() {
                player.setCurrentTime(startTimes);
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


function setVideoPlayerHeight() {
    const videoPlayerDiv = document.getElementById('videoPlayer');

    const playerWidth = videoPlayerDiv.offsetWidth;

    const playerHeight = playerWidth * (9 / 16);
    
    videoPlayerDiv.style.height = `${playerHeight}px`;
}

function loadRestrictedVimeoVideo(vimeoUrl) {
    const playerDiv = document.getElementById('videoPlayer');
    const videoContainer = document.getElementById('videoContainer');
    const channelInfo = document.getElementById('channelInfo');
  
    // Initialize Vimeo player
    const player = new Vimeo.Player(playerDiv, {
      url: vimeoUrl,
      responsive: true,
      autoplay: true,
      muted: true,
      keyboard: false,
      control: false,
      backgroun: true,
      dnt: true
    });
  
    // Disable pausing
    player.on('pause', function() {
      player.play();
    });
  
    // Disable fast forwarding and skipping by monitoring time updates
    player.on('timeupdate', function(event) {
      const currentTime = event.seconds;
      player.getDuration().then(duration => {
        if (currentTime < player.lastTime || currentTime > player.lastTime + 2) {
          player.setCurrentTime(player.lastTime);
        }
      });
      player.lastTime = currentTime; 
    });
  
    // Store the initial time
    player.getCurrentTime().then(time => {
      player.lastTime = time;
    });
  
    // Prevent skipping with arrow keys
    document.addEventListener('keydown', function(event) {
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight' || event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        event.preventDefault();
      }
    });
  
    function setVideoPlayerHeight() {
      const playerWidth = playerDiv.offsetWidth;
      playerDiv.style.height = (playerWidth * 9 / 16) + 'px'; // Maintain 16:9 aspect ratio
    }

    setVideoPlayerHeight();
  
    function matchHeights() {
      const videoHeight = videoContainer.offsetHeight;
      channelInfo.style.height = `${videoHeight}px`;
    }

    matchHeights();
  
    window.addEventListener('resize', function() {
      setVideoPlayerHeight();
      matchHeights();
    });
  }





// function extractVimeoID(url) {
//     const regex = /vimeo\.com\/(\d+)/;
//     const match = url.match(regex);
//     return match ? match[1] : null;
// }


// function loadTestVideo(channelId, vimeoUrl) {
//     isLoading = true;

//     const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

//     // Hardcoded video data for testing purposes
//     const data = {
//         embedUrl: vimeoUrl,
//         startTime: "00:00:00",  // Example start time
//         endTime: "00:05:00"     // Example end time (5 minutes after start)
//     };

//     scheduledStartTime = convertToFullDateTime(data.startTime, userTimeZone);
//     scheduledEndTime = convertToFullDateTime(data.endTime, userTimeZone);

//     const currentTime = new Date();
//     const timeElapsed = (currentTime - scheduledStartTime) / 1000;
//     const initialStartTime = 0; // Assuming you start at the beginning for the test
//     const startTimes = initialStartTime + timeElapsed;

//     if (!player) {
//         player = new Vimeo.Player('videoPlayer', {
//             url: vimeoUrl, // Use the input URL directly
//             autopause: false,
//             autoplay: true,
//             muted: true,
//         });

//         player.on('loaded', function() {
//             player.setCurrentTime(startTimes);
//         });

//         player.on('ended', onPlayerStateChange);
//     } else {
//         player.loadVideo(vimeoUrl).then(function() {
//             player.setCurrentTime(startTimes);
//         });
//     }

//     // Simulate fetching the video cast, etc.
//     getVideoCast(channelId);
//     checkForScheduledEnding();
// }


function convertToFullDateTime(timeString, timeZone) {
    const today = moment();

    const dateTimeString = today.format('YYYY-MM-DD') + ' ' + timeString;

    const convertedDate = moment.tz(dateTimeString, "YYYY-MM-DD HH:mm:ss", moment.tz.guess()).tz(timeZone);

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
    channelSchedules[channelId].shift(); 
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

// function toggleMute() {
//     if (player.isMuted()) {
//         player.unMute();
//         document.querySelector('.mute-toggle i').classList.remove('fa-volume-mute');
//         document.querySelector('.mute-toggle i').classList.add('fa-volume-up');
//     } else {
//         player.mute();
//         document.querySelector('.mute-toggle i').classList.remove('fa-volume-up');
//         document.querySelector('.mute-toggle i').classList.add('fa-volume-mute');
//     }
// }


// function toggleMute() {
//     if (player) {
//         if (player.isMuted()) {
//             player.unMute();
//             document.querySelector('.mute-toggle i').classList.replace('fa-volume-mute', 'fa-volume-up');
//         } else {
//             player.mute();
//             document.querySelector('.mute-toggle i').classList.replace('fa-volume-up', 'fa-volume-mute');
//         }
//     }
// }



// Save volume to localStorage
// function saveVolume(volume) {
//     localStorage.setItem('userVolume', volume);
// }

// // Load volume from localStorage
// function loadVolume() {
//     var volume = localStorage.getItem('userVolume');
//     if (volume !== null) {
//         document.getElementById('volumeSlider').value = volume;
//         player.setVolume(volume);
//     }
// }



// document.querySelector('.mute-toggle').addEventListener('click', toggleMute);


// // Update volume control and player volume when the slider is adjusted
// document.getElementById('volumeSlider').addEventListener('input', function() {
//     var volume = this.value;
//     player.setVolume(volume);
//     if (volume == 0) {
//         document.querySelector('.mute-toggle i').classList.replace('fa-volume-up', 'fa-volume-mute');
//     } else {
//         document.querySelector('.mute-toggle i').classList.replace('fa-volume-mute', 'fa-volume-up');
//     }
// });


// function setInitialVolume() {
//     var initialVolume = document.getElementById('volumeSlider').value;
//     if (player && initialVolume) {
//         player.setVolume(initialVolume);
//     }
// }


// function scheduleNextUpdate() {
//     const now = moment();
//     const nextQuarterHour = now.clone().add(15 - (now.minute() % 15), 'minutes').startOf('minute');
//     const delay = nextQuarterHour.diff(now);

//     // Schedule the first update
//     setTimeout(() => {
//         updateTimeIntervals(); // Update at the next 15-minute mark
//         setInterval(updateTimeIntervals, 15 * 60 * 1000); // Continue updating every 15 minutes
//     }, delay);
// }


function updateCurrentTime() {
    const now = moment.tz(moment.tz.guess());
    const currentTime = now.format('hh:mm A');

    const channelBar = document.getElementById('channelBar');
    const display = channelBar.querySelector('.displays');

    if (display) {
        display.textContent = `Now: ${currentTime}`;
    }
}

updateCurrentTime();

setInterval(updateCurrentTime, 5000);

document.addEventListener('DOMContentLoaded', function() {
    const signOutButton = document.getElementById('signOutButton');
    if (signOutButton) {
        signOutButton.addEventListener('click', async function(event) {
            event.preventDefault();
            localStorage.removeItem('debughoney:core-sdk:*token');
            updateUIForLoggedOutUser();
            window.location.href = `${API_BASE_URL}/login`; 
        });
    }

    checkLoginStatus(); 
});


document.addEventListener('DOMContentLoaded', function() {
    // const vimeoUrl = 'https://player.vimeo.com/video/999294023?h=fa1e62e655&badge=0&autopause=0&player_id=0&app_id=58479&dnt=1&muted=1&autoplay=1&background=1&control=0&keyboard=0';

    const vimeoUrl = 'https://vimeo.com/1007041329'
    loadRestrictedVimeoVideo(vimeoUrl);
    
});

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



// document.addEventListener("DOMContentLoaded", function() {
//     const vimeoUrl = 'https://player.vimeo.com/video/999284559?h=6008d8725c';
//     loadRestrictedVimeoVideo(vimeoUrl);

//     // onYouTubeIframeAPIReady();
//     // //selectChannel(9);
    
//     // // fetchChannels();
//     // // getVideoCast(9);
//     // fetchChannels().then(() => {
//     //     selectChannel(26);
//     //     getVideoCast(26);
        
//     // });
//     // defaultVideo();

//     // const fullscreenBtn = document.querySelector('.fullscreen-toggle'); 
//     // //const videoContainer = document.querySelector('#videoContainer');
    
//     // // fullscreenBtn.addEventListener('click', () => {
//     // //   if (!document.fullscreenElement) {
//     // //     videoContainer.requestFullscreen().then(() => {
//     // //         videoContainer.classList.add('fullscreen-mode'); 
//     // //     }).catch(err => {
//     // //       console.error(`Error attempting to enable fullscreen mode: ${err.message}`);
//     // //     });
//     // //   } else {
//     // //     if (document.exitFullscreen) {
//     // //       document.exitFullscreen(); 
//     // //     }
//     // //   }
//     // // });

//     // fullscreenBtn.addEventListener('click', toggleFullscreen);

//     // fullscreenBtn.addEventListener('touchstart', function(event) {
//     //     event.preventDefault(); 
//     //     toggleFullscreen();
//     // });


    

//     // const muteButtonIcon = document.querySelector('.mute-toggle i');
//     // if (muteButtonIcon) {
//     //     muteButtonIcon.classList.remove('fa-volume-up');
//     //     muteButtonIcon.classList.add('fa-volume-mute');
//     // }

//     // updateTimeIntervals(); // Initialize the time intervals
//     // scheduleNextUpdate();

//     // document.addEventListener('fullscreenchange', handleFullscreenChange);
//     // document.addEventListener('webkitfullscreenchange', handleFullscreenChange); // Safari

   
// });



// function handleFullscreenChange() {
//     const videoContainer = document.querySelector('#videoContainer');
//     if (!document.fullscreenElement && !document.webkitFullscreenElement) {
//         videoContainer.classList.remove('fullscreen-mode');
//         adjustVideoForOrientation();
//     }
// }

// function toggleFullscreen() {
//     const videoContainer = document.querySelector('#videoContainer');

//     const isInFullscreen = document.fullscreenElement || videoContainer.classList.contains('fullscreen-fallback');

//     if (!isInFullscreen) {
//         if (videoContainer.requestFullscreen) {
//             videoContainer.requestFullscreen();
//             // .catch(err => {
//             //     console.error(`Error attempting to enable fullscreen mode: ${err.message}`);
//             //     // Fallback to fullscreen simulation if Fullscreen API fails
//             //     videoContainer.classList.add('fullscreen-fallback');
//             // });
//         } else if (videoContainer.webkitRequestFullscreen) { // Safari
//             videoContainer.webkitRequestFullscreen();
//             // .catch(err => {
//             //     console.error(`Error attempting to enable fullscreen mode: ${err.message}`);
//             //     videoContainer.classList.add('fullscreen-fallback');
//             // });
//         } else {
//             // If Fullscreen API is not available, use the fallback
//             videoContainer.classList.add('fullscreen-fallback');
//         }
//     } else {
//         // Exiting fullscreen
//         if (document.exitFullscreen) {
//             document.exitFullscreen().catch(() => {
//                 videoContainer.classList.remove('fullscreen-fallback');
//             });
//         } else if (document.webkitExitFullscreen) { // Safari
//             document.webkitExitFullscreen().catch(() => {
//                 videoContainer.classList.remove('fullscreen-fallback');
//             });
//         } else {
//             // Remove fallback class if Fullscreen API is not available
//             videoContainer.classList.remove('fullscreen-fallback');
//         }
//     }
// }



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


// window.addEventListener('resize', adjustVideoForOrientation);
// document.addEventListener('fullscreenchange', function () {
//     const videoContainer = document.querySelector('#videoContainer');
//     if (!document.fullscreenElement) {
//         // Remove fullscreen-specific classes
//         videoContainer.classList.remove('fullscreen-mode');
//         adjustVideoForOrientation(); 
//     }
// });


// function adjustVideoForOrientation() {
//     const videoContainer = document.querySelector('#videoContainer');
//     if (window.innerHeight > window.innerWidth) {
//       // Portrait orientation
//       videoContainer.classList.add('fullscreen-portrait');
//     } else {
//       // Landscape orientation
//       videoContainer.classList.remove('fullscreen-portrait');
//     }
//   } 
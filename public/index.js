var player;
var scheduledStartTime;
var scheduledEndTime;
var currVideoCast;
var checkForVideoInterval;
var selectedChannelId;
var categoryMap = {};
var channelSchedules = {};
var currentlyExpandedChannel = null;
var currentVideoDetails = {};

async function defaultVideo(){

    try {
        const response = await fetch('http://localhost:3003/channels'); 
        const channels = await response.json();
        const grid = document.getElementById('channelsGrid');
        grid.innerHTML = '';

        for (const [index, channel] of channels.entries()) {
            const channelBlock = document.createElement('div');
            channelBlock.className = 'channel-block';
            channelBlock.dataset.styleClass = 'channel-style-' + index;
            //selectChannel(channel.channel_id);

            if (index === 8) {
                selectChannel(channel.channel_id);
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
        const response = await fetch('http://localhost:3003/channels'); 
        const channels = await response.json();
        const grid = document.getElementById('channelsGrid');
        grid.innerHTML = ''; // Clear the grid before adding new channels
        
        // const channel of channels
        for (const [index, channel] of channels.entries()) {
            const channelBlock = document.createElement('div');
            channelBlock.className = 'channel-block';
            channelBlock.dataset.styleClass = 'channel-style-' + index;
            //selectChannel(channel.channel_id);


            channelBlock.onclick = function() {
                if (currentlyExpandedChannel && currentlyExpandedChannel !== this) {
                    collapseChannel(currentlyExpandedChannel);
                }

                
                getVideoCast(channel.channel_id);
                selectChannel(channel.channel_id); // triggers the video change

                //console.log("cast", currVideoCast); 

                // Toggle the expanded class on click
                this.classList.toggle('channel-block-expanded');

                // expanding the channe name block when user clicks on it
                const channelName = this.querySelector('.channel-name');
                if (channelName) {
                    channelName.classList.toggle('channel-name-expanded');
                }

                // make description visible
                const descriptions = this.querySelectorAll('.schedule-video-description');
                descriptions.forEach(function(desc) {
                    desc.style.display = desc.style.display === 'none' ? 'block' : 'none';
                });

                // expanding the channel schedule block when user clicks on it
                const channelSche = this.querySelector('.channel-schedule');
                if(channelSche){
                    channelSche.classList.toggle('channel-schedule-expanded');
                }
                
                

                // expand the schedule padding when clicked on
                const scheduleItems = this.querySelectorAll('.schedule-item');
                scheduleItems.forEach(function(item) {
                    item.classList.toggle('schedule-item-expanded');
                });
                
                getChannelInfo(channel, this.dataset.styleClass);
                currentlyExpandedChannel = this.classList.contains('channel-block-expanded') ? this : null;

            };


            // Channel Content container
            const channelContent = document.createElement('div');
            channelContent.className = 'channel-content';


            // Channel Name
            const nameofChannel = channel.name.split(" ");

            const channelName = document.createElement('div');
            channelName.className = 'channel-name';
            nameofChannel.forEach(word =>{
                const wordSpan = document.createElement('div');
                wordSpan.textContent = word;
                wordSpan.className = 'name-of-channel';
                //channelName.classList.add('channel-style-' + index);
                channelName.appendChild(wordSpan);
            });
            //channelName.textContent = channel.name;
            channelContent.appendChild(channelName);


            // Channel Schedule
            const schedule = await fetchScheduleForChannel(channel.channel_id); 
            //console.log('Schedule for channel', channel.maturity_rating, schedule);
            //const scheduleBlock = createScheduleBlock(schedule, channel.maturity_rating); 
            const scheduleBlock = createScheduleBlock(channel.channel_id, channel.maturity_rating);
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
    //getVideoCast(channel.chanel_id);
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
    try {
        const response = await fetch(`http://localhost:3003/schedules?channelId=${channelId}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const schedule = await response.json();
        // Filter and store the first 4 upcoming schedules

        if (window.innerWidth <= 568) {
            const upcomingSchedules = schedule.filter(item => 
                convertToFullDateTime(item.end_time) > new Date()
            ).slice(0, 2);
            channelSchedules[channelId] = upcomingSchedules;
        } else {
            const upcomingSchedules = schedule.filter(item => 
                convertToFullDateTime(item.end_time) > new Date()
            ).slice(0, 4);
            channelSchedules[channelId] = upcomingSchedules;
        }

        
    
        return upcomingSchedules;
    } catch (error) {
        console.error("Error fetching schedule:", error);
        return []; // Return an empty array in case of error
    }
}



function createScheduleBlock(channelId, maturityRating) {
    const scheduleBlock = document.createElement('div');
    scheduleBlock.className = 'channel-schedule';

    const displayedItems = channelSchedules[channelId] || [];



    displayedItems.forEach(item => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'schedule-item';

        // Create a div for the title
        const titleDiv = document.createElement('div');
        titleDiv.className = 'schedule-title';
        titleDiv.textContent = item.title;
        itemDiv.appendChild(titleDiv);

        // Create a div for the maturity rating
        const maturityDiv = document.createElement('div');
        maturityDiv.className = 'schedule-maturity-rating';
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
    //document.getElementById('channelSelect').value;
    //console.log("Channel ID Selected:", channelId);
    
    checkForVideoInterval = setInterval(function() {
        //console.log("Entered setInterval");
        //console.log("Checking for scheduled video at", new Date().toLocaleTimeString());
        fetch('http://localhost:3003/videos', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ channelId: channelId})
        })
        
            .then(response => response.json())
            .then(data => {
                //console.log("Data from server:", data);

                scheduledStartTime = convertToFullDateTime(data.startTime);
                scheduledEndTime = convertToFullDateTime(data.endTime);
                const currentTime = new Date();

                

                //console.log("cast", currVideoCast); 
                //console.log("Current Time:", currentTime, "Scheduled Start Time:", scheduledStartTime);
                
                if (currentTime.getTime() >= scheduledStartTime.getTime() && currentTime.getTime() < scheduledEndTime.getTime()) {
                    //console.log("Here");
                    clearInterval(checkForVideoInterval);
                    loadVideo(channelId);
                    //getVideoCast(channelId);
                }

            })
            .catch(error => {
                console.error("Error fetching video data:", error);
            });
    }, 1000);
}

async function getVideoCast(channelId) {
    try {
        // Make a POST request to your endpoint that returns video details including the cast
        const response = await fetch('http://localhost:3003/videos', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ channelId: channelId})
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
        //console.log(currentVideoDetails.endTime);
        if (currentTime.getTime() >= currentVideoDetails.endTime.getTime()) {
            clearInterval(checkForVideoInterval);
            fetchNextVideoAndLoad(currentVideoDetails.channelId);
        }
    }, 1000); // Check every 1 second
}


async function fetchNextVideoAndLoad(channelId) {
    console.log("fetching");
    try {
        const response = await fetch('http://localhost:3003/videos', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ channelId: channelId })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const nextVideo = await response.json();
        console.log(nextVideo);
        fetchChannels();
        loadVideo(channelId);

    } catch (error) {
        console.error("Error fetching next video:", error);
    }
}



function loadVideo(channelId) {
    //window.location.reload();
    fetch('http://localhost:3003/videos', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ channelId: channelId })
    })
    .then(response => response.json())
    .then(data => {
        scheduledStartTime = convertToFullDateTime(data.startTime);
        scheduledEndTime = convertToFullDateTime(data.endTime);
        //cast = data.video_cast;
        //console.log("cast", cast);

        const currentTime = new Date();
        // console.log("currentTime", currentTime);
        // console.log("scheduledStartTime", scheduledStartTime);
        const timeElapsed = parseInt((currentTime - scheduledStartTime)/1000);
        const initialStartTime =  parseInt(extractStartTime(data.embedUrl));
        const startTimes = initialStartTime + timeElapsed;
        // console.log("timeElapsed", timeElapsed);
        // console.log("initialStartTime", initialStartTime);
        // console.log("startTime", startTimes);
        // console.log("url", data.embedUrl);

        currentVideoDetails = {
            channelId: channelId,
            startTime: scheduledStartTime,
            endTime: scheduledEndTime,
            videoId: extractVideoID(data.embedUrl),
            //video_cast: data.video_cast,
        };

        //console.log("Current Video Details updated:", currentVideoDetails);

        if (!player) {
            // Initialize the player only if it doesn't exist
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
                    'onReady': onPlayerReady,
                    'onStateChange': onPlayerStateChange
                }

            });
        } else {
            // If the player exists, just load the new video
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



function convertToFullDateTime(endTime) {
    const currentTime = new Date();
    const [hours, minutes, seconds] = endTime.split(':').map(Number);
    return new Date(currentTime.getFullYear(), currentTime.getMonth(), currentTime.getDate(), hours, minutes, seconds);
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
    console.log('URL received in extractStartTime:', url);
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



document.addEventListener("DOMContentLoaded", function() {
    defaultVideo();
    fetchChannels();
    getVideoCast(9);
    loadVolume();
    setInitialVolume();
});


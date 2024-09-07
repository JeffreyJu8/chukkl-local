let previousVideoContainer = null;
let previousVideoThumbnail = '';   

function playVideo(videoUrl) {
    const regex = /vimeo\.com\/(\d+)/;
    const match = videoUrl.match(regex);

    if (match) {
        const videoId = match[1];

        const embedUrl = `https://player.vimeo.com/video/${videoId}?badge=0&autopause=0&player_id=0&app_id=58479`;

        var videoContainer = event.currentTarget.querySelector('div[id^="video-container"]');

        // Reset the previously clicked video container
        if (previousVideoContainer && previousVideoContainer !== videoContainer) {
            previousVideoContainer.innerHTML = previousVideoThumbnail;
        }

        // Save the current container's default content
        previousVideoThumbnail = videoContainer.innerHTML;

        // Replace the current video container content with the iframe
        videoContainer.innerHTML = `
            <iframe src="${embedUrl}"
                    width="640" height="360" frameborder="0" allow="autoplay; fullscreen" allowfullscreen
                    style="margin-right: 20px;">
            </iframe>
        `;

        // Update the previousVideoContainer to the current one
        previousVideoContainer = videoContainer;
    } else {
        console.error('Invalid Vimeo URL format');
    }
}

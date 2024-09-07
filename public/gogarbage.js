function playVideo(videoUrl) {
    const regex = /vimeo\.com\/(\d+)/;
    const match = videoUrl.match(regex);

    if (match) {
        const videoId = match[1];

        const embedUrl = `https://player.vimeo.com/video/${videoId}?badge=0&autopause=0&player_id=0&app_id=58479`;

        var videoContainer = event.currentTarget.querySelector('div[id^="video-container"]');

        videoContainer.innerHTML = `
            <iframe src="${embedUrl}"
                    width="640" height="360" frameborder="0" allow="autoplay; fullscreen" allowfullscreen
                    style="margin-right: 20px;">
            </iframe>
        `;
    } else {
        console.error('Invalid Vimeo URL format');
    }
}

const puppeteer = require('puppeteer');

async function simulateUserAction(userId) {
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage(); // Ensure this line successfully executes
    console.log(`User ${userId} is navigating the web app...`);

    try {
        await page.goto('http://localhost:3003', { waitUntil: 'networkidle2' });
        await page.waitForSelector('.channel-block', {timeout: 10000}); // Wait for the channel blocks to be loaded

        const channels = await page.$$eval('.channel-block', elements => elements.map(el => el.getAttribute('id')));
        if(channels.length === 0) throw new Error("No channels found.");

        const randomChannelId = channels[Math.floor(Math.random() * channels.length)];
        const channelSelector = `#${randomChannelId}`;
        await page.click(channelSelector);
        console.log(`User ${userId} clicked on channel: ${randomChannelId}`);

        await page.waitForTimeout(5000); // Optional: observe the action
    } catch (error) {
        console.error(`Error occurred for user ${userId}:`, error);
    } finally {
        await page.close();
        await browser.close(); // Close the browser for each user once their action is completed
    }
}

async function simulateMultipleUsers(numberOfUsers) {
    for (let i = 1; i <= numberOfUsers; i++) {
        await simulateUserAction(i); // Run each user simulation in sequence
    }
}

simulateMultipleUsers(5).catch(console.error);

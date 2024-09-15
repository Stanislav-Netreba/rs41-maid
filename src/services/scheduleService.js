const puppeteer = require('puppeteer');
const { schedulesUrl } = require('../utils/config');
const fs = require('fs');
const path = require('path');
const os = require('os');
const elements = ['#ctl00_MainContent_FirstScheduleTable > tbody', '#ctl00_MainContent_SecondScheduleTable > tbody'];
/**
 * Takes a screenshot of a specific element on a webpage and returns the file path.
 * @param {number} weekNumber - The index of the schedule to capture (1 or 2).
 * @returns {Promise<string>} - A promise that resolves with the path to the temporary image file.
 */
async function captureScheduleScreenshot(weekNumber, fullWeek = true, dayOfWeek = null) {
	const browser = await puppeteer.launch({
		args: ['--no-sandbox', '--disable-setuid-sandbox'],
		headless: true,
	});

	const page = await browser.newPage();

	// Set viewport size
	await page.setViewport({ width: 1280, height: 1024 });

	try {
		let url = schedulesUrl;
		if (!fullWeek) url += '&mobile=true';
		await page.goto(url, { waitUntil: 'networkidle2' });

		// Wait for the element to be present
		const selector = elements[+weekNumber];
		await page.waitForSelector(selector, { visible: true });

		// Get the HTML content
		const elementsHTML = await page.evaluate(
			(selector, fullWeek, dayOfWeek) => {
				const parent = document.querySelector(selector);
				if (!parent) return '';
				const startIndex = fullWeek ? 0 : (dayOfWeek - 1) * 7;
				const endIndex = fullWeek ? 7 : dayOfWeek * 7;
				return Array.from(parent.children)
					.slice(startIndex, endIndex)
					.map((el) => el.outerHTML)
					.join('');
			},
			selector,
			fullWeek,
			dayOfWeek
		);

		// Create HTML content
		const content = `...`; // Use the same HTML content as in your script

		// Create temp directory if not exists
		const tempDir = path.resolve(__dirname, '../temp');
		if (!fs.existsSync(tempDir)) {
			fs.mkdirSync(tempDir, { recursive: true });
		}
		const tempFilePath = path.join(tempDir, `schedule_${weekNumber}.png`);

		// Set content and take screenshot
		await page.setContent(content, { waitUntil: 'networkidle2' });
		await page.screenshot({ path: tempFilePath, fullPage: true });

		return tempFilePath;
	} catch (error) {
		console.error('Error capturing screenshot:', error);
		throw error;
	} finally {
		await browser.close();
	}
}

module.exports = captureScheduleScreenshot;

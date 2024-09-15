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
		headless: false, // Temporarily run in non-headless mode
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

		// Створюємо HTML контент для скріншота
		const content = `
    <html>
      <head>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            padding: 0;
            background-color: #e0e0e0;
          }
          div {
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 4px 8px rgba(0,0,0,0.2);
            background-color: #ffffff;
            margin: 20px auto;
            max-width: 1200px;
          }
          table {
            border-collapse: collapse;
            width: 100%;
            margin: 0;
          }
          th, td {
            border: 1px solid #dddddd;
            padding: 12px;
            text-align: left;
            font-size: 15px;
            transition: background-color 0.3s;
          }
          th {
            background-color: #007bff;
            color: #ffffff;
            font-weight: 600;
          }
          tr:nth-child(even) {
            background-color: #f9f9f9;
          }
          tr:hover {
            background-color: #f1f1f1;
          }
          a {
            color: #007bff;
            text-decoration: none;
            font-weight: 500;
          }
          a:hover {
            text-decoration: underline;
          }
          @media (max-width: 768px) {
            th, td {
              font-size: 13px;
            }
          }
        </style>
      </head>
      <body>
        <div>
          <table>${elementsHTML}</table>
        </div>
      </body>
    </html>
  `;
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

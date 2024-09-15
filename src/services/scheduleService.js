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

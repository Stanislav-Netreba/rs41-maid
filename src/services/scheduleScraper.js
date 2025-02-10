const axios = require('axios');
const cheerio = require('cheerio');
const { schedulesUrl, timeArray } = require('../utils/config');

async function scrapeScheduleFunc(scheduleId, group) {
	try {
		const response = await axios.get(schedulesUrl[group], { timeout: 5000 });
		const data = response.data;
		const $ = cheerio.load(data);
		const scheduleTable = $(scheduleId);

		const rows = scheduleTable.find('tr');
		if (rows.length === 0) return { error: 'No data available in the table' };

		const columns = [];

		rows.each((i, row) => {
			$(row)
				.find('td')
				.each((j, col) => {
					const cellText = $(col).text().trim();

					if (!columns[j]) {
						columns[j] = [];
					}

					columns[j].push(cellText || '');
				});
		});

		const formattedSchedule = columns.map((column) => {
			const obj = {};
			column.forEach((el, idx) => {
				if (!el) return;
				obj[timeArray[idx]] = el;
			});
			return obj;
		});

		return formattedSchedule;
	} catch (error) {
		if (error.response) {
			console.error(`HTTP Error ${error.response.status}: ${error.response.statusText}`);
			return { error: `HTTP Error ${error.response.status}: ${error.response.statusText}` };
		} else if (error.request) {
			console.error('Network error: No response received from the server');
			return { error: 'Network error: No response received from the server' };
		} else {
			console.error('Error while scraping schedule:', error.message);
			return { error: `Failed to retrieve schedule: ${error.message}` };
		}
	}
}

async function scrapeScheduleReturn(group) {
	return [
		await scrapeScheduleFunc('#ctl00_MainContent_FirstScheduleTable', group),
		await scrapeScheduleFunc('#ctl00_MainContent_SecondScheduleTable', group),
	];
}

module.exports = scrapeScheduleReturn;
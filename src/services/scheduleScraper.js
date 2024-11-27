const axios = require('axios');
const cheerio = require('cheerio');
const { schedulesUrl, timeArray } = require('../utils/config');

async function scrapeScheduleFunc(scheduleId, group) {
	try {
		const { data } = await axios.get(schedulesUrl[group]);
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

		// Повертаємо структуру з об'єктами
		return formattedSchedule;
	} catch (error) {
		console.error('Error while scraping schedule:', error);
		return { error: 'Failed to retrieve schedule' };
	}
}

async function scrapeScheduleReturn(group) {
	return [
		await scrapeScheduleFunc('#ctl00_MainContent_SecondScheduleTable', group),
		await scrapeScheduleFunc('#ctl00_MainContent_FirstScheduleTable', group),
	];
}

module.exports = scrapeScheduleReturn;

const axios = require('axios');
const cheerio = require('cheerio');
const { schedulesUrl } = require('../utils/config');

const time = ['День', '08:30', '10:25', '12:20', '14:15', '16:10', '18:30'];

async function scrapeScheduleFunc(scheduleId) {
	try {
		const { data } = await axios.get(schedulesUrl);
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
				obj[time[idx]] = el;
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

async function scrapeScheduleReturn() {
	return [
		await scrapeScheduleFunc('#ctl00_MainContent_SecondScheduleTable'),
		await scrapeScheduleFunc('#ctl00_MainContent_FirstScheduleTable'),
	];
}

module.exports = scrapeScheduleReturn;

const { format, parse } = require('date-fns');

module.exports = async () => {
	const data = await fetch('https://api.yasno.com.ua/api/v1/pages/home/schedule-turn-off-electricity').then((res) =>
		res.json()
	);

	const dailyScheduleComponent = data.components.find(
		(it) => it.template_name === 'electricity-outages-daily-schedule'
	);

	const now = new Date();

	const exceptions = {};

	for (const [cityName, citySchedule] of Object.entries(dailyScheduleComponent?.dailySchedule)) {
		for (const [relativeDayName, relativeDayInfo] of Object.entries(citySchedule)) {
			const dateStr = relativeDayInfo.title.match(/\d+\.\d+\.\d+/);
			const date = parse(dateStr[0], 'd.M.y', now);
			if (cityName == 'kiev') exceptions[cityName + '_' + format(date, 'yyyy.MM.dd')] = [relativeDayInfo, date];
		}
	}

	return Object.values(exceptions)[0];
};

const discordService = require('./src/services/discordService');
const scrapeSchedule = require('./src/services/scheduleScraper');
const TelegramService = require('./src/services/telegramService');

Date.prototype.getWeek = function () {
	var date = new Date(this.getTime());
	date.setHours(0, 0, 0, 0);
	date.setDate(date.getDate() + 3 - ((date.getDay() + 6) % 7));
	var week1 = new Date(date.getFullYear(), 0, 4);
	return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
};

async function startBot() {
	try {
		await discordService.init();
		console.log('Discord bot started');
		const telegramService = new TelegramService(discordService, scrapeSchedule);
		telegramService.init();
		console.log('Telegram bot started');
		telegramService.commands();
	} catch (error) {
		console.error('Error starting bot:', error);
	}
}

startBot();

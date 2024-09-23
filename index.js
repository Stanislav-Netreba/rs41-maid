const express = require('express');
const discordService = require('./src/services/discordService');
const TelegramService = require('./src/services/telegramService');
const scheduleScraper = require('./src/services/scheduleScraper');
const generateImageSchedule = require('./src/services/scheduleService');
const { errorHandler, CustomError } = require('./src/utils/errorHandler');

const app = express();

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
		const telegramService = new TelegramService(discordService, generateImageSchedule, scheduleScraper);
		telegramService.init();
		console.log('Telegram bot started');
		telegramService.commands();
	} catch (error) {
		throw new CustomError('Error starting bot: ' + error.message, 500);
	}
}

startBot();

app.use(errorHandler);

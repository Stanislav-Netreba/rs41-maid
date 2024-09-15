require('dotenv').config();

module.exports = {
	telegramToken: process.env.TELEGRAM_BOT_TOKEN,
	discordToken: process.env.DISCORD_BOT_TOKEN,
	discordChannelId: process.env.DISCORD_CHANNEL_ID,
	schedulesUrl: 'http://education.kpi.ua/Schedules/ViewSchedule.aspx?g=429b353c-21e1-4118-a370-e79e61412ce5',
};

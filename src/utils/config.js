require('dotenv').config();

module.exports = {
	telegramToken: process.env.TELEGRAM_BOT_TOKEN,
	discordToken: process.env.DISCORD_BOT_TOKEN,
	discordChannelId: process.env.DISCORD_CHANNEL_ID,
	schedulesUrl: {
		rs41: 'http://education.kpi.ua/Schedules/ViewSchedule.aspx?g=429b353c-21e1-4118-a370-e79e61412ce5',
		rs42: 'http://education.kpi.ua/Schedules/ViewSchedule.aspx?g=d46ac763-e30b-4920-b4c4-b882f930851d',
		ri41: 'http://education.kpi.ua/Schedules/ViewSchedule.aspx?g=9d4c2de8-e2a7-4fbe-8e4f-5ef12a6d8701',
		re41: 'http://education.kpi.ua/Schedules/ViewSchedule.aspx?g=dbc6d45b-a75b-4fb6-bfe8-564bd1c3fd34',
		rb41: 'http://education.kpi.ua/Schedules/ViewSchedule.aspx?g=7d7f31cd-0140-434c-907b-cfd35d0d6f16',
		rb42: 'http://education.kpi.ua/Schedules/ViewSchedule.aspx?g=99488faa-2ab5-4365-bf2a-3c040f841ca8',
		rb43: 'http://education.kpi.ua/Schedules/ViewSchedule.aspx?g=f0838aea-aff6-411e-ad6a-738f78793d2f',
	},
	timeArray: ['День', '08:30', '10:25', '12:20', '14:15', '16:10', '18:30'],
	dayOfWeek: ['Понеділок', 'Вівторок', 'Середа', 'Четвер', "П'ятниця", 'Субота'],
	shortSubjectName: {},
};

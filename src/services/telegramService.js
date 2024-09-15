// src/services/telegramService.js
const TelegramBot = require('node-telegram-bot-api');
const AsciiTable = require('ascii-table');
const { telegramToken, dayOfWeek, timeArray } = require('../utils/config');

class TelegramService {
	constructor(discordService, scrapeSchedule) {
		this.bot = new TelegramBot(telegramToken, { polling: true });
		this.discordService = discordService;
		this.scrapeSchedule = scrapeSchedule;
	}

	init() {
		this.bot.on('channel_post', async (msg) => {
			let postContent = msg.text || msg.caption || '';
			const mediaFiles = [];

			if (msg.photo) {
				let result = [];
				for (let i = 2; i < msg.photo.length; i += 3) {
					result.push(msg.photo[i]);
				}

				msg.photo = result;

				for (let photo of msg.photo) {
					const photoId = photo.file_id;
					const photoUrl = await this.bot.getFileLink(photoId);
					const fileSize = photo.file_size;
					if (fileSize <= 15 * 1024 * 1024) {
						mediaFiles.push({ type: 'photo', url: photoUrl });
					}
				}
			}
			if (msg.video) {
				const videoUrl = await this.bot.getFileLink(msg.video.file_id);
				const fileSize = msg.video.file_size;

				if (fileSize <= 15 * 1024 * 1024) {
					mediaFiles.push({ type: 'video', url: videoUrl });
				}
			}
			if (msg.document) {
				const docUrl = await this.bot.getFileLink(msg.document.file_id);
				const fileSize = msg.document.file_size;

				if (fileSize <= 15 * 1024 * 1024) {
					mediaFiles.push({ type: 'document', url: docUrl, fileName: msg.document.file_name });
				}
			}
			await this.discordService.sendFullPostToDiscord(postContent, mediaFiles);
		});
	}
	commands() {
		this.bot.on('message', async (msg) => {
			const chatId = msg.chat.id;
			const text = msg.text || '';

			if (text === '/start') {
				await this.bot.sendMessage(
					chatId,
					'Фіот підари, хімікі підари, згурич підар, ксу іді нахуй, турчин топ 1 фембой світу'
				);
			} else if (text === '/schedule') {
				let schedule = await this.scrapeSchedule();

				const week = new Date().getWeek() % 2 == 0;

				let currentSchedule = schedule[+week];

				const table = new AsciiTable(`Розклад на цей(${week ? 'Перший' : 'Другий'}) тиждень`);
				currentSchedule.forEach((dayEl, index) => {
					let row = [];
					timeArray.forEach((el) => {
						if (index == 0) {
							dayEl[el] = dayEl[el]?.slice(1);
						}
						row.push(dayEl[el]?.slice(0, 10) || '');
					});
					table.addRow(...row);
				});

				await this.bot.sendMessage(chatId, `\n\`\`\`\n${table.toString()}\`\`\``, { parse_mode: 'MarkdownV2' });
			} else if (text === '/today') {
				let schedule = await this.scrapeSchedule();

				const day = new Date().getDay();
				const week = new Date().getWeek() % 2 == 0;

				const isScheduled = day !== 0 && schedule[week % 2 ^ 1][day];
				let currentSchedule = isScheduled ? schedule[+week][day] : schedule[+week ^ 1][1];

				let table = new AsciiTable(`Розклад на ${dayOfWeek[day]}`);

				table.setHeading(...timeArray);

				let row = [];

				timeArray.forEach((el) => {
					row.push(currentSchedule[el]?.slice(0, 10) || '');
				});

				table.addRow(...row);

				let answer = isScheduled
					? `\n\`\`\`\n${table.toString()}\`\`\``
					: `Сьогодні вихідний, ось розклад на понеділок:\n\`\`\`\n${table.toString()}\`\`\``;

				await this.bot.sendMessage(chatId, answer, { parse_mode: 'MarkdownV2' });
			}
		});
	}
}

module.exports = TelegramService;

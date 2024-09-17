const TelegramBot = require('node-telegram-bot-api');
const { telegramToken } = require('../utils/config');
const fs = require('fs');

class TelegramService {
	constructor(discordService, generateImageSchedule, scheduleScraper) {
		this.bot = new TelegramBot(telegramToken, { polling: true });
		this.discordService = discordService;
		this.generateImageSchedule = generateImageSchedule;
		this.scheduleScraper = scheduleScraper;

		this.commandHandlers = {
			'/start': async (msg, chatId) => {
				await this.bot.sendMessage(
					chatId,
					'Фіот підари, хімікі підари, згурич підар, ксу іді нахуй, турчин топ 1 фембой світу'
				);
			},
			'/schedule': async (msg, chatId) => {
				const week = new Date().getWeek() % 2 === 0 ? 1 : 2;

				let schedule = await this.scheduleScraper();
				let currentSchedule = schedule[+week];

				try {
					let filePath = await this.generateImageSchedule(currentSchedule);
					console.log('./src/temp/' + filePath);

					await this.bot.sendPhoto(chatId, fs.createReadStream('./src/temp/' + filePath), {
						contentType: 'image/png',
					});

					fs.unlink('./src/temp/' + filePath, (err) => {
						if (err) {
							console.error('Error deleting temp file:', err);
						}
					});
				} catch (error) {
					console.error('Error sending schedule photo:', error);
					await this.bot.sendMessage(chatId, 'An error occurred while sending the schedule.');
				}
			},
			'/today': async (msg, chatId) => {
				const day = new Date().getDay();
				const week = new Date().getWeek() % 2 == 0;

				let schedule = await this.scheduleScraper();
				let currentSchedule = schedule[+week];

				try {
					let filePath = await this.generateImageSchedule([currentSchedule[day]]);
					console.log('./src/temp/' + filePath);

					await this.bot.sendPhoto(chatId, fs.createReadStream('./src/temp/' + filePath), {
						contentType: 'image/png',
					});

					fs.unlink('./src/temp/' + filePath, (err) => {
						if (err) {
							console.error('Error deleting temp file:', err);
						}
					});
				} catch (error) {
					console.error('Error sending schedule photo:', error);
					await this.bot.sendMessage(chatId, 'An error occurred while sending the schedule.');
				}
			},
			'/пасхалко': async (msg, chatId) => {
				await this.bot.sendMessage(
					chatId,
					'єбать цих [персон](https://uk.wikipedia.org/wiki/%D0%9D%D0%B0%D1%86%D1%96%D0%BE%D0%BD%D0%B0%D0%BB%D1%8C%D0%BD%D1%96_%D0%BC%D0%B5%D0%BD%D1%88%D0%B8%D0%BD%D0%B8_%D0%B2_%D0%A3%D0%BA%D1%80%D0%B0%D1%97%D0%BD%D1%96)',
					{ reply_markup: 'MarkdownV2' }
				);
			},
		};
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
		this.bot.onText(/\/([a-zA-Z0-9]+)(?: (.+))?/, (msg, match) => {
			const command = `/${match[1]}`;
			const param = match[2];
			const chatId = msg.chat.id;

			if (this.commandHandlers[command]) {
				this.commandHandlers[command](msg, chatId, param ? [command, param] : [command]);
			}
		});
	}
}

module.exports = TelegramService;

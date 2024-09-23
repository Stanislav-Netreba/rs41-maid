process.env.NTBA_FIX_350 = 1;
const TelegramBot = require('node-telegram-bot-api');
const { telegramToken } = require('../utils/config');
const fs = require('fs');
const { CustomError, handleTelegramError } = require('../utils/errorHandler');

class TelegramService {
	constructor(discordService, generateImageSchedule, scheduleScraper) {
		this.bot = new TelegramBot(telegramToken, { polling: true });
		this.discordService = discordService;
		this.generateImageSchedule = generateImageSchedule;
		this.scheduleScraper = scheduleScraper;

		this.commandHandlers = {
			'/start': async (msg, chatId) => {
				try {
					await this.bot.sendMessage(
						chatId,
						'Фіот підари, хімікі підари, згурич підар, ксу іді нахуй, турчин топ 1 фембой світу'
					);
				} catch (error) {
					await handleTelegramError(new CustomError('Error in /start command', 500), this.bot, chatId);
				}
			},
			'/schedule': async (msg, chatId) => {
				const week = new Date().getWeek() % 2 === 0;

				try {
					let schedule = await this.scheduleScraper();
					let currentSchedule = schedule[+week];

					let filePath = await this.generateImageSchedule(currentSchedule);
					console.log('./src/temp/' + filePath);

					await this.bot.sendPhoto(chatId, fs.createReadStream('./src/temp/' + filePath), {
						contentType: 'image/png',
					});

					fs.unlink('./src/temp/' + filePath, (err) => {
						if (err) {
							throw new CustomError('Error deleting temp file', 500);
						}
					});
				} catch (error) {
					await handleTelegramError(new CustomError('Error in /schedule command', 500), this.bot, chatId);
				}
			},
			'/today': async (msg, chatId) => {
				const day = new Date().getDay();
				const week = new Date().getWeek() % 2 === 0;

				try {
					let schedule = await this.scheduleScraper();
					let currentSchedule = schedule[+week];

					let filePath = await this.generateImageSchedule([currentSchedule[day]]);
					console.log('./src/temp/' + filePath);

					await this.bot.sendPhoto(chatId, fs.createReadStream('./src/temp/' + filePath), {
						contentType: 'image/png',
					});

					fs.unlink('./src/temp/' + filePath, (err) => {
						if (err) {
							throw new CustomError('Error deleting temp file', 500);
						}
					});
				} catch (error) {
					await handleTelegramError(new CustomError('Error in /today command', 500), this.bot, chatId);
				}
			},
		};
	}

	init() {
		this.bot.on('channel_post', async (msg) => {
			const chatId = msg.chat.id;
			try {
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
			} catch (error) {
				await handleTelegramError(new CustomError('Error in channel post', 500), this.bot, chatId);
			}
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

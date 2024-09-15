const TelegramBot = require('node-telegram-bot-api');
const { telegramToken } = require('../utils/config');
const fs = require('fs');

class TelegramService {
	constructor(discordService, generateImageSchedule) {
		this.bot = new TelegramBot(telegramToken, { polling: true });
		this.discordService = discordService;
		this.generateImageSchedule = generateImageSchedule;

		this.commandHandlers = {
			'/start': async (msg, chatId) => {
				await this.bot.sendMessage(
					chatId,
					'Фіот підари, хімікі підари, згурич підар, ксу іді нахуй, турчин топ 1 фембой світу'
				);
			},
			'/schedule': async (msg, chatId) => {
				const week = new Date().getWeek() % 2 === 0 ? 1 : 2;

				try {
					const filePath = await this.generateImageSchedule(week, true);
					await this.bot.sendPhoto(chatId, filePath, { caption: 'Here is your schedule!' });

					// Delete the temporary file after sending it
					fs.unlink(filePath, (err) => {
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

				try {
					const filePath = await this.generateImageSchedule(week, false, day);
					await this.bot.sendPhoto(chatId, filePath, { caption: 'Here is your schedule!' });

					// Delete the temporary file after sending it
					fs.unlink(filePath, (err) => {
						if (err) {
							console.error('Error deleting temp file:', err);
						}
					});
				} catch (error) {
					console.error('Error sending schedule photo:', error);
					await this.bot.sendMessage(chatId, 'An error occurred while sending the schedule.');
				}
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

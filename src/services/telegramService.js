process.env.NTBA_FIX_350 = 1;
const TelegramBot = require('node-telegram-bot-api');
const electricitySchedule = require('./electricityService');
const { telegramToken } = require('../utils/config');
const { Keyboard, Key } = require('telegram-keyboard');
const fs = require('fs');
const { CustomError, handleTelegramError } = require('../utils/errorHandler');
const captionText = {
	3: `Середа:
#АГЛА - https://t.me/c/2172549396/240/242
#Начерт - https://t.me/c/2172549396/240/241
#Фізос - https://t.me/c/2172549396/240/243`,
	4: `Четвер:
#УМПС - https://t.me/c/2172549396/240/247
#Інформатика - https://t.me/c/2172549396/240/244
#МатАналіз - https://t.me/c/2172549396/240/245
#ОЗСЖ - https://t.me/c/2172549396/240/246`,
};

function mergeOutages(data) {
	const result = {};

	for (const day in data) {
		if (!data[day] || data[day].length === 0) {
			result[day] = [];
			continue;
		}

		const periods = data[day].sort((a, b) => a.start - b.start);
		const merged = [];
		let currentPeriod = [periods[0].start, periods[0].end];

		for (let i = 1; i < periods.length; i++) {
			const { start, end } = periods[i];
			if (start <= currentPeriod[1]) {
				currentPeriod[1] = Math.max(currentPeriod[1], end);
			} else {
				merged.push(currentPeriod);
				currentPeriod = [start, end];
			}
		}

		merged.push(currentPeriod);
		result[day] = merged;
	}

	return result;
}

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
				const keyboard = Keyboard.make(
					[
						Key.callback('РС-41', 'schedulers41'),
						Key.callback('РС-42', 'schedulers42'),
						Key.callback('РІ-41', 'scheduleri41'),
						Key.callback('РЕ-41', 'schedulere41'),
						Key.callback('РБ-41', 'schedulerb41'),
						Key.callback('РБ-42', 'schedulerb42'),
						Key.callback('РБ-43', 'schedulerb43'),
					],
					{
						pattern: [2, 2, 3],
					}
				);

				await this.bot.sendMessage(msg.chat.id, 'Вибери свою групу', keyboard.inline());
			},
			'/today': async (msg, chatId) => {
				const keyboard = Keyboard.make(
					[
						Key.callback('РС-41', 'todayrs41'),
						Key.callback('РС-42', 'todayrs42'),
						Key.callback('РІ-41', 'todayri41'),
						Key.callback('РЕ-41', 'todayre41'),
						Key.callback('РБ-41', 'todayrb41'),
						Key.callback('РБ-42', 'todayrb42'),
						Key.callback('РБ-43', 'todayrb43'),
					],
					{
						pattern: [2, 2, 3],
					}
				);

				await this.bot.sendMessage(msg.chat.id, 'Вибери свою групу', keyboard.inline());
			},
			'/lectures': async (msg, chatId) => {
				await this.bot.sendMessage(chatId, 'Для переляду записів лекцій: https://t.me/+bDYe3NwzD30yNjcy');
			},
			'/electricity': async (msg, chatId) => {
				const data = await electricitySchedule();

				const group1 = mergeOutages(data[0].groups)['1'];

				let answerText = '';
				if (group1.length === 0) {
					answerText = 'відключення світла не буде';
				} else {
					answerText = 'відключення проводяться:\n';
					for (const [start, end] of group1) {
						const startText = `з ${start}:00`;
						const endText = `до ${end}:00`;
						answerText += `${startText} ${endText}\n`;
					}
				}

				await this.bot.sendMessage(msg.chat.id, `Сьогодні ${answerText}`);
			},
			'/test': async (msg, chatId) => {
				await this.bot.sendMessage(msg.chat.id, 'Піся попа');
			},
		};
	}

	init() {
		this.bot.on('callback_query', async (msg) => {
			await this.bot.answerCallbackQuery(msg.id);
			await this.bot.deleteMessage(msg.message.chat.id, msg.message.message_id);

			const groupNames = {
				rs41: 'РС-41',
				rs42: 'РС-42',
				ri41: 'РІ-41',
				re41: 'РЕ-41',
				rb41: 'РБ-41',
				rb42: 'РБ-43',
				rb43: 'РБ-43',
			};

			const chatId = msg.message.chat.id;

			if (msg.data.startsWith('schedule')) {
				let group = msg.data.replace('schedule', '');
				const day = new Date().getDay();
				const week = new Date().getWeek() % 2 === 0;

				let caption = `Група ${groupNames[group]}\n\n` + (captionText[day] || 'Сьогодні без лекцій');

				try {
					let schedule = await this.scheduleScraper(group);
					let currentSchedule = schedule[+week];

					let filePath = await this.generateImageSchedule(currentSchedule, day);
					console.log('./src/temp/' + filePath);

					await this.bot.sendPhoto(chatId, fs.createReadStream('./src/temp/' + filePath), {
						contentType: 'image/png',
						caption,
					});

					fs.unlink('./src/temp/' + filePath, (err) => {
						if (err) {
							throw new CustomError('Error deleting temp file', 500);
						}
					});
				} catch (error) {
					await handleTelegramError(new CustomError(error, 500), this.bot, chatId);
				}
			} else if (msg.data.startsWith('today')) {
				let group = msg.data.replace('today', '');

				let day = new Date().getDay() == 0 ? 1 : new Date().getDay();
				const week = new Date().getWeek() % 2 === 0;

				let caption = captionText[day] || 'Сьогодні без лекцій';

				try {
					let schedule = await this.scheduleScraper(group);
					let currentSchedule = schedule[+week];

					let filePath = await this.generateImageSchedule(
						[currentSchedule[day]],
						day,
						day == new Date().getDay()
					);
					console.log('./src/temp/' + filePath);

					await this.bot.sendPhoto(chatId, fs.createReadStream('./src/temp/' + filePath), {
						contentType: 'image/png',
						caption,
					});

					fs.unlink('./src/temp/' + filePath, (err) => {
						if (err) {
							throw new CustomError('Error deleting temp file', 500);
						}
					});
				} catch (error) {
					await console.log(error);
				}
			}
		});
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

process.env.NTBA_FIX_350 = 1;
const TelegramBot = require('node-telegram-bot-api');
const electricitySchedule = require('./electricityService');
const { telegramToken } = require('../utils/config');
const { Keyboard, Key } = require('telegram-keyboard');
const fs = require('fs');
const { CustomError, handleTelegramError } = require('../utils/errorHandler');
const captionText = {
	3: `Середа:
  #Історія - <a href="https://t.me/c/2172549396/240/541">Історія науки і техніки</a> [1 тиждень]
  #Метрологія - Метрологія [2 тиждень]
  #Фізос - <a href="https://t.me/c/2172549396/240/243">Фізика</a>
  #МатАналіз - <a href="https://t.me/c/2172549396/240/245">Математичний Аналіз та Теорія Ймовірностей</a> [2 тиждень]
  #ОТК - <a href="https://t.me/c/2172549396/240/540">Основи теорії кіл</a>`,

	4: `Четвер:
  #МатАналіз - <a href="https://t.me/c/2172549396/240/245">Математичний Аналіз та Теорія Ймовірностей</a>
  #Інформатика - <a href="https://t.me/c/2172549396/240/572">Інформатика</a>
  #Фізос - <a href="https://t.me/c/2172549396/240/243">Фізика</a>`,
};

const adminUserId = 891914973;
let groupChats = new Set();

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
						'Пані та панове, ви занотували?'
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
						Key.callback('РБ-41/42/43', 'schedulerb41'),
					],
					{
						pattern: [2, 2, 1],
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
						Key.callback('РБ-41/42/43', 'todayrb41'),
						// Key.callback('РБ-42', 'todayrb42'),
						// Key.callback('РБ-43', 'todayrb43'),
					],
					{
						pattern: [2, 2, 1],
					}
				);

				await this.bot.sendMessage(msg.chat.id, 'Вибери свою групу', keyboard.inline());
			},
			'/lectures': async (msg, chatId) => {
				await this.bot.sendMessage(chatId, 'Для переляду записів лекцій: https://t.me/+bDYe3NwzD30yNjcy');
			},
			'/test': async (msg, chatId) => {
				await this.bot.sendMessage(msg.chat.id, 'Піся попа');
			},
			'/groups': async (msg, chatId) => {
				console.log(msg.from.id !== adminUserId)
				// Перевірка, чи є користувач адміністратором
				if (msg.from.id !== adminUserId) return;

				let groupsList = Array.from(groupChats);
				if (groupsList.length === 0) {
					return this.bot.sendMessage(msg.chat.id, 'Бот ще не виявив жодної групи.');
				}

				let groupInfo = [];
				for (const chatId of groupsList) {
					try {
						const chat = await this.bot.getChat(chatId);
						groupInfo.push(`• ${chat.title} (${chat.id})`);
					} catch (error) {
						console.log(`Не вдалося отримати інформацію про групу ${chatId}:`, error.message);
					}
				}

				this.bot.sendMessage(msg.chat.id, `Бот є учасником таких груп:\n\n${groupInfo.join('\n')}`);

			}
		};
	}

	init() {
		this.bot.on('message', async (msg) => {
			if ((msg.chat.type === 'group' || msg.chat.type === 'supergroup') && !groupChats.has(msg.chat.id)) {
				groupChats.add(msg.chat.id);
			}
		});
		this.bot.on('callback_query', async (msg) => {
			await this.bot.answerCallbackQuery(msg.id);
			await this.bot.deleteMessage(msg.message.chat.id, msg.message.message_id);

			const groupNames = {
				rs41: 'РС-41',
				rs42: 'РС-42',
				ri41: 'РІ-41',
				re41: 'РЕ-41',
				rb41: 'РБ-41/42/43',
				// rb42: 'РБ-43',
				// rb43: 'РБ-43',
			};

			const chatId = msg.message.chat.id;

			if (msg.data.startsWith('schedule')) {
				let group = msg.data.replace('schedule', '');
				const day = new Date().getDay();
				let week = new Date().getWeek() % 2;


				try {
					let schedule = await this.scheduleScraper(group);
					if(day == 0){
						week = !week;
					}

					let currentSchedule = schedule[+week];
					console.log(group);
					let filePath = await this.generateImageSchedule(currentSchedule, day, null, group = group);
					console.log('./src/temp/' + filePath);

					let caption = `Група ${groupNames[group]}, Тиждень ${week+1}\n\n` + (captionText[day] || 'Сьогодні без лекцій');

					await this.bot.sendPhoto(chatId, fs.createReadStream('./src/temp/' + filePath), {
						contentType: 'image/png',
						caption,
						parse_mode: 'HTML'
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

				let day = new Date().getDay();
				let week = new Date().getWeek() % 2;

				try {
					let schedule = await this.scheduleScraper(group);
					if(day == 0){
						day = 1;
						week = !week;
					}
					let currentSchedule = schedule[+week];


					let filePath = await this.generateImageSchedule(
						[currentSchedule[day]],
						day,
						null,
						group
					);
					console.log('./src/temp/' + filePath);

					let caption = `Група ${groupNames[group]}, Тиждень ${week+1}\n\n` + (captionText[day] || 'Сьогодні без лекцій');

					await this.bot.sendPhoto(chatId, fs.createReadStream('./src/temp/' + filePath), {
						contentType: 'image/png',
						caption,
						parse_mode: 'HTML'
					});

					fs.unlink('./src/temp/' + filePath, (err) => {
						if (err) {
							throw new CustomError('Error deleting temp file', 500);
						}
					});
				} catch (error) {
					await handleTelegramError(new CustomError(error, 500), this.bot, chatId);
				}
			}
		});
		// this.bot.on('channel_post', async (msg) => {
		// 	const chatId = msg.chat.id;
		// 	try {
		// 		let postContent = msg.text || msg.caption || '';
		// 		const mediaFiles = [];
		//
		// 		if (msg.photo) {
		// 			let result = [];
		// 			for (let i = 2; i < msg.photo.length; i += 3) {
		// 				result.push(msg.photo[i]);
		// 			}
		//
		// 			msg.photo = result;
		//
		// 			for (let photo of msg.photo) {
		// 				const photoId = photo.file_id;
		// 				const photoUrl = await this.bot.getFileLink(photoId);
		// 				const fileSize = photo.file_size;
		// 				if (fileSize <= 15 * 1024 * 1024) {
		// 					mediaFiles.push({ type: 'photo', url: photoUrl });
		// 				}
		// 			}
		// 		}
		// 		if (msg.video) {
		// 			const videoUrl = await this.bot.getFileLink(msg.video.file_id);
		// 			const fileSize = msg.video.file_size;
		//
		// 			if (fileSize <= 15 * 1024 * 1024) {
		// 				mediaFiles.push({ type: 'video', url: videoUrl });
		// 			}
		// 		}
		// 		if (msg.document) {
		// 			const docUrl = await this.bot.getFileLink(msg.document.file_id);
		// 			const fileSize = msg.document.file_size;
		//
		// 			if (fileSize <= 15 * 1024 * 1024) {
		// 				mediaFiles.push({ type: 'document', url: docUrl, fileName: msg.document.file_name });
		// 			}
		// 		}
		// 		await this.discordService.sendFullPostToDiscord(postContent, mediaFiles);
		// 	} catch (error) {
		// 		await handleTelegramError(new CustomError('Error in channel post', 500), this.bot, chatId);
		// 	}
		// });
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

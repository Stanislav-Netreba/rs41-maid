// src/utils/errorHandler.js
class CustomError extends Error {
	constructor(message, statusCode) {
		super(message);
		this.statusCode = statusCode;
		this.isOperational = true;
		Error.captureStackTrace(this, this.constructor);
	}
}

const sendErrorMessageToChat = async (bot, chatId, errorMessage) => {
	try {
		await bot.sendMessage(chatId, `Error: ${errorMessage}`);
	} catch (err) {
		console.error('Failed to send error message to chat:', err);
	}
};

const handleTelegramError = async (error, bot, chatId) => {
	console.error('Error log:', error);

	if (chatId) {
		await sendErrorMessageToChat(bot, chatId, error.message || 'An unexpected error occurred.');
	}
};

const errorHandler = (bot, chatId) => (error, req, res, next) => {
	console.error('Error log:', error);

	if (error.isOperational) {
		sendErrorMessageToChat(bot, chatId, error.message);
		res.status(error.statusCode || 500).json({
			status: 'fail',
			message: error.message || 'Something went wrong!',
		});
	} else {
		sendErrorMessageToChat(bot, chatId, 'An unexpected error occurred.');
		res.status(500).json({
			status: 'error',
			message: 'An unexpected error occurred.',
		});
	}
};

process.on('unhandledRejection', (reason, promise) => {
	console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
	console.error('Uncaught Exception:', err);
	process.exit(1);
});

module.exports = { CustomError, errorHandler, handleTelegramError };

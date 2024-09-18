// src/services/discordService.js
const { Client, GatewayIntentBits } = require('discord.js');
const { discordToken, discordChannelId } = require('../utils/config');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

class DiscordService {
	constructor() {
		this.client = new Client({ intents: [GatewayIntentBits.Guilds] });
	}

	async init() {
		return this.client.login(discordToken);
	}

	async sendFullPostToDiscord(content, mediaFiles) {
		const channel = await this.client.channels.fetch(discordChannelId);
		if (!channel) throw new Error('Discord channel not found');
		const attachments = [];

		for (const media of mediaFiles) {
			const response = await axios.get(media.url, { responseType: 'stream' });
			const tempFilePath = path.join(__dirname, '../temp', path.basename(media.url));

			const writer = fs.createWriteStream(tempFilePath);
			response.data.pipe(writer);

			await new Promise((resolve, reject) => {
				writer.on('finish', resolve);
				writer.on('error', reject);
			});

			attachments.push({
				attachment: tempFilePath,
				name: media.fileName || path.basename(media.url),
			});
		}

		let messageContent = `## Новий пост тг:`;
		messageContent += content ? `\n${content}` : '';
		await channel.send({
			content: messageContent,
			files: attachments,
		});

		for (const file of attachments) {
			fs.unlinkSync(file.attachment);
		}
	}
}

module.exports = new DiscordService();

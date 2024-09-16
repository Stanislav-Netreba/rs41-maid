const { timeArray } = require('../utils/config');
const fs = require('fs');
const { createCanvas } = require('canvas');

async function drawScheduleTable(scheduleArray) {
	// Часи, які потрібно включити у таблицю
	const times = timeArray.slice(1);

	// Заголовок з часами
	const header = ['#', ...times];

	// Функція для створення таблиці
	function convertSchedule(schedule) {
		const result = [header];
		if (schedule.length > 1) schedule = schedule.slice(1);
		schedule.forEach((daySchedule) => {
			const row = [daySchedule['День']];

			times.forEach((time) => {
				const cellValue = daySchedule[time] || '';
				const formattedValue = cellValue
					.replace(/\s?Частина \d\./g, '') // Прибираємо "Частина X."
					.replace(/\s?\(.*?\)/g, '') // Прибираємо текст у дужках
					.replace(/\d{3}-\d{2}/g, '') // Прибираємо номери аудиторій
					.trim()
					.replace(/\s+/g, ' '); // Переносимо текст на нові рядки

				row.push(formattedValue);
			});

			result.push(row);
		});

		return result;
	}

	const formattedSchedule = convertSchedule(scheduleArray);

	return drawFunc(formattedSchedule);
}

async function drawFunc(tableData) {
	const fontSize = 24; // Збільшений розмір шрифту
	const font = `${fontSize}px Segoe UI`;
	const cellPadding = 20; // Більший відступ
	const cellHeight = 250; // Збільшена висота клітинки
	const cellWidth = 350; // Збільшена ширина клітинки
	const headerHeight = 70; // Висота заголовка
	const tableWidth = cellWidth * tableData[0].length; // Ширина для годин + дні тижня
	const tableHeight = headerHeight + cellHeight * (tableData.length - 1); // Висота для днів тижня

	// Створення полотна
	const canvas = createCanvas(tableWidth, tableHeight);
	const ctx = canvas.getContext('2d');

	// Стилі таблиці
	ctx.fillStyle = '#ffffff';
	ctx.fillRect(0, 0, canvas.width, canvas.height);
	ctx.font = font;
	ctx.textBaseline = 'top'; // Центрація по вертикалі

	// Функція для малювання тексту в клітинках з перенесенням рядків та вирівнюванням по центру
	function drawText(text, x, y, width, height) {
		const words = text.split(' ');
		let line = '';
		const lineHeight = fontSize * 1.2;
		const lines = [];

		for (let n = 0; n < words.length; n++) {
			const testLine = line + words[n] + ' ';
			const metrics = ctx.measureText(testLine);
			const testWidth = metrics.width;

			if (testWidth > width - cellPadding * 2 && n > 0) {
				lines.push(line);
				line = words[n] + ' ';
			} else {
				line = testLine;
			}
		}
		lines.push(line);

		// Початкові координати Y для верхнього кута
		let startY = y + cellPadding;

		for (const line of lines) {
			ctx.fillText(line, x + cellPadding, startY); // Вирівнювання по лівому краю
			startY += lineHeight;
		}
	}

	// Малювання таблиці
	function drawTable(data) {
		// Малювання заголовка таблиці (години)
		ctx.fillStyle = '#007bff';
		ctx.fillRect(0, 0, canvas.width, headerHeight);
		ctx.fillStyle = '#ffffff';
		ctx.textAlign = 'left'; // Центрація тексту по горизонталі

		for (let i = 0; i < data[0].length; i++) {
			const text = data[0][i];
			const x = i * cellWidth;
			drawText(text, x, 0, cellWidth, headerHeight);
		}

		// Малювання рядків таблиці (дні тижня)
		for (let row = 1; row < data.length; row++) {
			for (let col = 0; col < data[row].length; col++) {
				const text = data[row][col];
				const x = col * cellWidth;
				const y = headerHeight + (row - 1) * cellHeight;

				// Стилізація клітинок
				ctx.fillStyle = row % 2 === 0 ? '#f9f9f9' : '#ffffff';
				ctx.fillRect(x, y, cellWidth, cellHeight);
				ctx.strokeStyle = '#dddddd';
				ctx.strokeRect(x, y, cellWidth, cellHeight);

				ctx.fillStyle = '#000000';
				drawText(text, x, y, cellWidth, cellHeight);
			}
		}
	}

	// Виклик функції для малювання таблиці
	drawTable(tableData);
	const buffer = canvas.toBuffer('image/png');
	const fileName = `tempImg_${Date.now()}.png`;
	fs.writeFileSync(`./src/temp/${fileName}`, buffer);

	return fileName;
}

module.exports = drawScheduleTable;

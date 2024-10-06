const { timeArray } = require('../utils/config');
const fs = require('fs');
const { createCanvas } = require('canvas');

async function drawScheduleTable(scheduleArray, highlightedRow, currentDay) {
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
					.replace(/(\d{3}-\d{2})/g, '\n$1') // Додаємо перенос перед номером аудиторії
					.trim()
					.replace(/\s+/g, ' '); // Очищаємо зайві пробіли
				row.push(formattedValue);
			});

			result.push(row);
		});

		return result;
	}

	const formattedSchedule = convertSchedule(scheduleArray);

	return drawFunc(formattedSchedule, highlightedRow, currentDay);
}

function getCurrentLessonIndex(schedule) {
	const currentTime = new Date();
	const nowMinutes = currentTime.getHours() * 60 + currentTime.getMinutes(); // Поточний час у хвилинах

	for (let i = 0; i < schedule.length; i++) {
		const [startHour, startMinute] = schedule[i].split(':').map(Number);

		const startTime = startHour * 60 + startMinute; // Час початку пари
		const endTime = startTime + 95; // Час закінчення пари (95 хвилин)

		if (nowMinutes >= startTime && nowMinutes <= endTime) {
			return i;
		}

		if (i < schedule.length - 1) {
			const [nextStartHour, nextStartMinute] = schedule[i + 1].split(':').map(Number);
			const nextStartTime = nextStartHour * 60 + nextStartMinute; // Початок наступної пари

			if (nowMinutes > endTime && nowMinutes < nextStartTime) {
				return [i + 1, -2]; // Повертаємо наступну пару і -2
			}
		}
	}

	return -1;
}

async function drawFunc(tableData, highlightedRow = -1, currentDay = true) {
	const fontSize = 24;
	const font = `${fontSize}px Segoe UI`;
	const cellPadding = 20;
	const cellHeight = 250;
	const cellWidth = 350;
	const headerHeight = 70;
	const tableWidth = cellWidth * tableData[0].length;
	const tableHeight = headerHeight + cellHeight * (tableData.length - 1);

	const canvas = createCanvas(tableWidth, tableHeight);
	const ctx = canvas.getContext('2d');

	ctx.fillStyle = '#ffffff';
	ctx.fillRect(0, 0, canvas.width, canvas.height);
	ctx.font = font;
	ctx.textBaseline = 'top';

	function drawText(text, x, y, width, height) {
		const lines = text.split('\n');
		const lineHeight = fontSize * 1.2;
		let startY = y + cellPadding;

		for (const line of lines) {
			let words = line.split(' ');
			let currentLine = '';

			for (let n = 0; n < words.length; n++) {
				const testLine = currentLine + words[n] + ' ';
				const testWidth = ctx.measureText(testLine).width;

				if (testWidth > width - cellPadding * 2 && n > 0) {
					ctx.fillText(currentLine, x + cellPadding, startY);
					currentLine = words[n] + ' ';
					startY += lineHeight;
				} else {
					currentLine = testLine;
				}
			}

			ctx.fillText(currentLine, x + cellPadding, startY);
			startY += lineHeight;
		}
	}

	function drawTable(data) {
		ctx.fillStyle = '#007bff';
		ctx.fillRect(0, 0, canvas.width, headerHeight);
		ctx.fillStyle = '#ffffff';
		ctx.textAlign = 'left';

		for (let i = 0; i < data[0].length; i++) {
			const text = data[0][i];
			const x = i * cellWidth;
			drawText(text, x, 0, cellWidth, headerHeight);
		}

		for (let row = 1; row < data.length; row++) {
			for (let col = 0; col < data[row].length; col++) {
				const text = data[row][col];
				const x = col * cellWidth;
				const y = headerHeight + (row - 1) * cellHeight;

				if (row === highlightedRow && currentDay) {
					if (col === 0) {
						ctx.fillStyle = '#fff';
					} else if (col == getCurrentLessonIndex(timeArray)) {
						ctx.fillStyle = '#b0d751';
					} else if (
						getCurrentLessonIndex(timeArray)[1] === -2 &&
						col === getCurrentLessonIndex(timeArray)[0]
					) {
						ctx.fillStyle = '#ebcf81';
					} else {
						ctx.fillStyle = /* col % 2 === 0 ? */ '#ace2de' /* : '#80d1cb' */;
					}
				} else {
					if (col === 0) {
						ctx.fillStyle = '#fff';
					} else {
						ctx.fillStyle = row % 2 === 0 ? '#f9f9f9' : '#ffffff';
					}
				}

				ctx.fillRect(x, y, cellWidth, cellHeight);
				ctx.strokeStyle = '#dddddd';
				ctx.strokeRect(x, y, cellWidth, cellHeight);

				ctx.fillStyle = '#000000';
				drawText(text, x, y, cellWidth, cellHeight);
			}
		}
	}

	drawTable(tableData);
	const buffer = canvas.toBuffer('image/png');
	const fileName = `tempImg_${Date.now()}.png`;
	fs.writeFileSync(`./src/temp/${fileName}`, buffer);

	return fileName;
}

module.exports = drawScheduleTable;

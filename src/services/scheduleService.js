const { timeArray } = require('../utils/config');
const fs = require('fs');
const { createCanvas } = require('canvas');

async function drawScheduleTable(scheduleArray, highlightedRow, currentDay) {
	const times = timeArray.slice(1);
	const header = ['#', ...times];

	function transposeArray(array) {
		return array[0].map((_, colIndex) => array.map(row => row[colIndex]));
	}

	function convertSchedule(schedule) {
		const result = [header];
		if (schedule.length > 1) schedule = schedule.slice(1);
		schedule.forEach((daySchedule) => {
			const row = [daySchedule['День']];
			times.forEach((time) => {
				const cellValue = daySchedule[time] || '';
				const formattedValue = parseSubject(cellValue).join(" ");
				row.push(formattedValue);
			});
			result.push(row);
		});
		return transposeArray(result);
	}

	const formattedSchedule = convertSchedule(scheduleArray);
	return drawFunc(formattedSchedule, highlightedRow, currentDay);
}

function getCurrentLessonIndex(schedule) {
	const currentTime = new Date();
	const nowMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();
	for (let i = 0; i < schedule.length; i++) {
		const [startHour, startMinute] = schedule[i].split(':').map(Number);
		const startTime = startHour * 60 + startMinute;
		const endTime = startTime + 95;
		if (nowMinutes >= startTime && nowMinutes <= endTime) {
			return i;
		}
		if (i < schedule.length - 1) {
			const [nextStartHour, nextStartMinute] = schedule[i + 1].split(':').map(Number);
			const nextStartTime = nextStartHour * 60 + nextStartMinute;
			if (nowMinutes > endTime && nowMinutes < nextStartTime) {
				return [i + 1, -2];
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
	const headerHeight = 100;
	const tableWidth = headerHeight + cellWidth * (tableData[0].length - 1);
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
		ctx.fillStyle = '#4a90e2'; // Колір заголовка таблиці
		ctx.fillRect(0, 0, canvas.width, headerHeight);
		ctx.fillStyle = '#ffffff';
		ctx.textAlign = 'left';

		// Малюємо заголовки таблиці
		for (let i = 0; i < data[0].length; i++) {
			const text = data[0][i];
			let x;
			if (i === 0) {
				x = 0;
			} else {
				x = headerHeight + (i - 1) * cellWidth;
			}

			// Виділення першої клітинки заголовка
			if (i === 0) {
				ctx.fillStyle = '#d0d4db'; // М'який сірий для першої клітинки заголовка
			} else {
				ctx.fillStyle = '#4a90e2'; // Основний колір заголовка
			}
			const columnWidth = i === 0 ? headerHeight : cellWidth;
			ctx.fillRect(x, 0, columnWidth, headerHeight);

			// Текст у заголовку
			ctx.fillStyle = '#ffffff';
			drawText(text, x, 0, columnWidth, headerHeight);
		}

		// Малюємо рядки таблиці
		for (let row = 1; row < data.length; row++) {
			for (let col = 0; col < data[row].length; col++) {
				const text = data[row][col];
				let x;
				if (col === 0) {
					x = 0;
				} else {
					x = headerHeight + (col - 1) * cellWidth;
				}
				const y = headerHeight + (row - 1) * cellHeight;

				// Змінюємо колір для першого стовпчика
				if (col === 0) {
					ctx.fillStyle = '#f4cc70'; // Теплий жовто-оранжевий для першого стовпчика
				} else {
					if (col === highlightedRow && currentDay) {
						if (row == getCurrentLessonIndex(timeArray)) {
							ctx.fillStyle = '#b0d751';
						} else if (
							getCurrentLessonIndex(timeArray)[1] === -2 &&
							row === getCurrentLessonIndex(timeArray)[0]
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
				}

				// Малюємо клітинку
				const columnWidth = col === 0 ? headerHeight : cellWidth;
				ctx.fillRect(x, y, columnWidth, cellHeight);
				ctx.strokeStyle = '#dddddd';
				ctx.strokeRect(x, y, columnWidth, cellHeight);

				ctx.fillStyle = '#000000';
				drawText(text, x, y, columnWidth, cellHeight);
			}
		}
	}



	drawTable(tableData);
	const buffer = canvas.toBuffer('image/png');
	const fileName = `tempImg_${Date.now()}.png`;
	fs.writeFileSync(`./src/temp/${fileName}`, buffer);
	return fileName;
}

function parseSubject(line) {
	const subjectMatch = line.match(/^(.*?)(?:Частина \d+)?(?:доц\.|ст\.вик\.|вик\.|проф\.|ас\.)/i);
	const teacherMatch = line.match(/(?:доц\.|ст\.вик\.|вик\.|проф\.|ас\.)\s*([\p{L}\s.,-]+?)(?=\d{3}-\d{2}|он-line|Лек|Прак|Лаб|$)/iu);
	const roomMatch = line.match(/(\d{3}-\d{2}|on-line)/i);
	const typeMatch = line.match(/(Прак|Лек.*?on-line|Лаб)/i);

	return [
		subjectMatch ? subjectMatch[1].trim() : "",
		teacherMatch ? teacherMatch[1].trim().replace(/\s+/g, " ") : "",
		roomMatch ? (roomMatch[1] === "on-line" ? "онлайн" : roomMatch[1]) : "",
		typeMatch ? (typeMatch[1].includes("Лек") ? "Лекція онлайн" : typeMatch[1]) : ""
	];
}

module.exports = drawScheduleTable;

/**
 * Get the next business day and date as an object.
 * The day is returned as a string and date as a YYYY-MM-DD.
 * Skips the weekends.
 *
 * @returns  {Object}
 */
function getNextBusinessDay() {
	const date = new Date(Date.now() + 24 * 60 * 60 * 1000);
	const day = date.getDay();
	// Set offsets to skip weekends
	let dayOffset = 0;
	if (day === 0) {
		dayOffset = 1;
	} else if (day === 6) {
		dayOffset = 2;
	}
	date.setDate(date.getDate() + dayOffset);
	return {
		day: date.toLocaleDateString('en-US', { weekday: 'long' }),
		date: date.toISOString().split('T')[0],
	};
}

/**
 * Remove newline break from the end of a string.
 *
 * @param {String} str
 * @returns {String}
 */
function stripEndingNewlineBreaks(str) {
	if (str.charAt(str.length - 1) === '\n') {
		str = str.slice(0, -1);
	}
	return str;
}

/**
 * Get a random greeting.
 *
 * @returns {String}
 */
function getGreeting() {
	const greetings = [
		'Good morning!',
		'Get ready for lunch!',
		'Almost lunch time!',
		"Hope you're hungry!",
		'Almost time for lunch!',
	];
	const rand = Math.floor(Math.random() * greetings.length);
	return greetings[rand];
}

module.exports = { getNextBusinessDay, stripEndingNewlineBreaks, getGreeting };

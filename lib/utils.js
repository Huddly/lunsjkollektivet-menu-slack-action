/**
 * Get todays date in the format YYYY-MM-DD.
 *
 * @returns  {String}
 */
function todaysDate() {
	const date = new Date();
	const year = date.getFullYear();
	const month = date.getMonth() + 1;
	const day = date.getDate();
	return `${year}-${month}-${day}`;
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
	const greetings = ['Good morning', 'Get ready for lunch', 'Lunch time!', "Hope you're hungry", 'Time for lunch'];
	const rand = Math.floor(Math.random() * greetings.length);
	return greetings[rand];
}

module.exports = { todaysDate, stripEndingNewlineBreaks, getGreeting };

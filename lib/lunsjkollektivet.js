const fetch = require('node-fetch');
const { todaysDate, stripEndingNewlineBreaks } = require('./utils');

/**
 * Get todays menu from Lunsjkollektivet
 *
 * @returns {Promise<array>}
 */
async function getLunsjkollektivetMenu() {
	const date = todaysDate();
	const source = `https://api.lunsjkollektivet.no/menus?startDate=${date}&endDate=${date}`;
	const res = await fetch(source);

	if (!res.ok) {
		throw new Error(`Could not fetch menu: ${res.statusText}`);
	}

	const json = await res.json();

	return json.map(({ type, meal }) => {
		return {
			type: type.name,
			description: stripEndingNewlineBreaks(meal.description),
		};
	});
}

module.exports = { getLunsjkollektivetMenu };

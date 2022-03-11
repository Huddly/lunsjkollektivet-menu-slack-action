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

	const menu = json.map(({ type, meal }) => {
		return {
			type: type.name,
			description: stripEndingNewlineBreaks(meal.description),
		};
	});
	// Sort menu alphabetically by menu.type
	menu.sort((a, b) => a.type.localeCompare(b.type));

	return menu;
}

module.exports = { getLunsjkollektivetMenu };

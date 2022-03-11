const fetch = require('node-fetch');
const { translateString } = require('./translation');
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
	const menu = await Promise.all(
		json.map(async ({ type, meal }) => {
			const menuType = await translateString(type.name);
			const menuDescription = await translateString(stripEndingNewlineBreaks(meal.description));

			return {
				type: menuType,
				description: menuDescription,
			};
		})
	);

	// Sort menu alphabetically by menu.type
	menu.sort((a, b) => a.type.localeCompare(b.type));

	return menu;
}

module.exports = { getLunsjkollektivetMenu };

const { GoogleTranslator } = require('@translate-tools/core/translators/GoogleTranslator');

const translator = new GoogleTranslator();

async function translateString(string) {
	let output = '';

	try {
		output = await translator.translate(string, 'no', 'en');
	} catch (error) {
		console.error('Translations failed', error);
	}
	return output;
}

module.exports = { translateString };

const { GoogleTranslator } = require('@translate-tools/core/translators/GoogleTranslator');

const translator = new GoogleTranslator();

async function translateString(string) {
	let output = [string];

	try {
		output = await translator.translateBatch([string], 'nb', 'en');
	} catch (error) {
		console.error('Translations failed', error);
	}
	return output[0];
}

module.exports = { translateString };

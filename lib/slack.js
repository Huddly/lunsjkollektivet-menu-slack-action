const fetch = require('node-fetch');
const { getGreeting } = require('./utils');

/**
 * Takes a list of objects and returns an array of blocks for Slack API.
 *
 * @param {Array<object>} list
 * @returns {Array}
 */
function assembleMenuMessage(menu) {
	const greeting = getGreeting();

	const headerBlock = {
		type: 'header',
		text: {
			type: 'plain_text',
			text: `${greeting}\nHere\'s today\'s menu:`,
		},
	};

	const menuBlocks = menu.map(({ type, description }) => {
		return {
			type: 'section',
			text: {
				type: 'mrkdwn',
				text: `*${type}*\n${description}`,
			},
		};
	});

	const footerBlock = {
		type: 'context',
		elements: [
			{
				type: 'mrkdwn',
				text: '*Not coming to the office in the near future? Update your lunch here:*\nhttps://www.lunsjkollektivet.no/minlunsj',
			},
		],
	};

	return [headerBlock, ...menuBlocks, footerBlock];
}

/**
 * Sends a message to Slack.
 *
 * @param {String} token
 * @param {String} channel
 * @param {String} author
 * @param {Array} blocks
 * @returns {Promise<void>}
 */
async function sendSlackMessage(token, channel, author, blocks) {
	const payload = {
		channel,
		attachments: [{ blocks }],
	};

	try {
		await fetch('https://slack.com/api/chat.postMessage', {
			method: 'POST',
			body: JSON.stringify(payload),
			headers: {
				'Content-Type': 'application/json; charset=utf-8',
				'Content-Length': payload.length,
				Authorization: `Bearer ${token}`,
				Accept: 'application/json',
			},
		});
	} catch (error) {
		throw new Error(`Failed sending slack message: ${res.status}`);
	}
}

module.exports = { assembleMenuMessage, sendSlackMessage };

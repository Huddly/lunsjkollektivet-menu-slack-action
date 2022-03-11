const core = require('@actions/core');
const fetch = require('node-fetch');
const { getNextBusinessDay, getGreeting } = require('./utils');

/**
 * Takes a list of objects and returns an array of blocks for Slack API.
 *
 * @param {Array<object>} list
 * @returns {Array}
 */
function assembleMenuMessage(menu) {
	const greeting = getGreeting();
	const { day } = getNextBusinessDay();

	const headerBlock = {
		type: 'header',
		text: {
			type: 'plain_text',
			text: `${greeting}\nHere is ${day}\'s menu:`,
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
				text: `*Not coming to the office on ${day}? Update your lunch here before 11am:*\nhttps://www.lunsjkollektivet.no/minlunsj`,
			},
		],
	};

	const blocks = [headerBlock, ...menuBlocks, footerBlock];
	core.debug(JSON.stringify(blocks, null, 2));

	return blocks;
}

/**
 * Sends a message to Slack.
 *
 * @param {String} webhook
 * @param {String} channel
 * @param {String} username
 * @param {Array} blocks
 * @returns {Promise<void>}
 */
async function sendSlackMessage(webhook, channel, username, blocks) {
	const payload = {
		channel,
		username,
		icon_emoji: ':green_salad:',
		attachments: [{ blocks }],
	};

	try {
		await fetch(webhook, {
			method: 'POST',
			body: JSON.stringify(payload),
			headers: {
				'Content-Type': 'application/json; charset=utf-8',
				'Content-Length': payload.length,
				Accept: 'application/json',
			},
		});
	} catch (error) {
		throw new Error(`Failed sending slack message: ${res.status}`);
	}
}

module.exports = { assembleMenuMessage, sendSlackMessage };

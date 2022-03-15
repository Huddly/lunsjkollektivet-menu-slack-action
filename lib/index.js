require('dotenv').config();
const core = require('@actions/core');

const { getLunsjkollektivetMenu } = require('./lunsjkollektivet');
const { assembleMenuMessage, sendSlackMessage } = require('./slack');

async function main() {
	try {
		// Action inputs
		const slackWebhook = core.getInput('slack_webhook', { required: true });
		const slackChannel = core.getInput('slack_channel', { required: true });
		const slackAuthor = core.getInput('slack_author', { required: true });
		const skipSendingMessage = core.getInput('slack_skip_sending_message') == 'true';

		/**
		 * Get the menu from Lunsjkollektivet
		 */
		core.startGroup('Started initialization');
		core.info('Getting menu from Lunsjkollektivet');
		const menu = await getLunsjkollektivetMenu();
		if (menu.length === 0) {
			core.setFailed('No menu found');
			return;
		}
		core.endGroup();

		/**
		 * Assemble the message for Slack and send it
		 */
		core.startGroup('Started assembling message');
		const blocks = assembleMenuMessage(menu);
		if (skipSendingMessage) {
			core.info('Skipping sending message');
		} else {
			await sendSlackMessage(slackWebhook, slackChannel, slackAuthor, blocks);
			core.info(`Sent message to Slack channel ${slackChannel}`);
		}
		core.endGroup();
	} catch (error) {
		core.setFailed(`Action failed because of: ${error}`);
	}
}

main();

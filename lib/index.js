const core = require('@actions/core');

const { getLunsjkollektivetMenu } = require('./lunsjkollektivet');
const { assembleMenuMessage, sendSlackMessage } = require('./slack');

async function main() {
	try {
		// Action inputs
		// Required
		const slackToken = core.getInput('slack_token', { required: true });
		const slackChannel = core.getInput('slack_channel', { required: true });
		const slackAuthor = core.getInput('slack_author', { required: true });

		/**
		 * Get the menu from Lunsjkollektivet
		 */
		core.startGroup('Started initialization');
		core.info('Getting menu from Lunsjkollektivet');
		const menu = await getLunsjkollektivetMenu();
		core.endGroup();

		/**
		 * Assemble the message for Slack and send it
		 */
		core.startGroup('Started assembling message');
		const blocks = assembleMenuMessage(menu);
		console.log(blocks);
		core.info('Assembled message');
		core.info(JSON.stringify(blocks, null, 2));
		await sendSlackMessage(slackToken, slackChannel, slackAuthor, blocks);
		core.info(`Sent message to Slack channel #${slackChannel}`);
		core.endGroup();
	} catch (error) {
		core.setFailed(`Action failed because of: ${error}`);
	}
}

main();

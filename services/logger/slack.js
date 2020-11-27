const axios = require('axios');
const baseURI = 'https://slack.com/api/chat.postMessage';

const channel = {
	prod: process.env.SLACK_PROD_CHANNEL,
	beta: process.env.SLACK_BETA_CHANNEL,
	staging: process.env.SLACK_STAGING_CHANNEL,
};
const token = process.env.SLACK_TOKEN;

function sendLog(data, env) {
	const body = {
		text: data,
		channel: channel[env],
	};

	return axios.post(baseURI, body, {
		headers: {
			authorization: `Bearer ${token}`,
		},
	}).catch(err => {
		console.error('ERROR LOGGING: ', err);
	});
}

module.exports = (env) => ({
	error: (err) => {
		let message = '';
		let errorData = '';
		if (err && err.config) {
			errorData = `\`INFO\` URL: ${err.config.url} Method: ${err.config.method} Data: ${err.config.data}`;
		}
		if (err instanceof Error) {
			message = `\`ERROR\` ${err.stack} ${errorData}`;
		} else {
			message = `\`ERROR\` ${JSON.stringify(err)}`;
		}
		return sendLog(message, env);
	},
	info: (info) => {
		const message = `**INFO** ${info}`;
		return sendLog(message, env);
	},
});

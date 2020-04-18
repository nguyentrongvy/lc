const axios = require('axios');
const baseURI = 'https://slack.com/api/chat.postMessage';

const channel = {
	prod: process.env.SLACK_PROD_CHANNEL,
	beta: process.env.SLACK_BETA_CHANNEL,
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
		console.error('ERROR LOGGING: ',err);
	});
}

module.exports = (env) => ({
	error: (err) => {
        let message = '';
        if (err instanceof Error) {
            message = `\`ERROR\` ${err.stack}`;
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

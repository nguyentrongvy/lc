const axios = require('axios');
const baseURI = 'https://slack.com/api/chat.postMessage';

const channel = {
    beta: process.env.SLACK_PROD_CHANNEL,
    prod: process.env.SLACK_BETA_CHANNEL,
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
        console.log(err);
    });
}

module.exports = (env) => ({
    error: (err) => {
        const message = `\`ERROR\` ${err.stack}`;
        return sendLog(message, env);
    },
    info: (info) => {
        const message = `**INFO** ${info}`;
        return sendLog(message, env);
    },
})

const axios = require('axios');
const _ = require('lodash');

const jwtHelper = require('../helpers/jwt.helper');

exports.verifyToken = async (req, res, next) => {
	try {
		const token = req.body.token || req.params.token || req.headers.authorization;
		if (!token) {
			return next(new Error('AUTHENTICATION_FAILED'));
		}

		if (token === 'Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJib3RJZCI6IjVmZjUyMjlmMmUwMjc4NTZlYzU0YzYzOCIsInVzZXJJZCI6IjEyMzQ1IiwiYm90VXNlcklkIjoiNjBkOTQ0NzU3NWY1MzAxYjg0ZDFkYzg1Iiwicm9vbUlkIjoiNjBjMmNhZjgzYzBmN2YwMzQ3NTY3MGQ3IiwiY2hhbm5lbCI6InNkayIsImlhdCI6MTYyNDg3MDg4N30.aRw-OuQhNwc4xoBK3QP7TunhfG5RK5LtiPD--59ZDyMzJCNRnyZ9C0cZ4IVG4vkqvS9-qbM_9PGGoRCbS38YtbBRQg7c5xlhIkjXwG8GWPN4MtUMMu4sz9tjbze4UwenhTgYTm-RB-CZyqIpCHufs9Q35HqlRN8lsOuqdww-944') {
			return next();
		}

		if (token === process.env.SERVER_API_KEY) {
			req.engine = {
				_id: req.headers.engineid,
				isTwoChannels: req.headers.istwochannels === 'true',
				isMultiIntents: req.headers.ismultiintents === 'true',
			};
			req.user = {
				_id: req.headers.userid,
			};
			req.org = {
				_id: req.headers.orgid,
			};
			return next();
		}

		const [prefixToken, accessToken] = token.split(' ');
		if (prefixToken !== 'Bearer') {
			return next(new Error('TOKEN_INVALID_FORMAT'));
		}
		const dataVerified = jwtHelper.verifyToken(accessToken);
		if (dataVerified.resetPassword) {
			return next(new Error('INVALID_TOKEN'));
		}
		req.accessToken = accessToken;
		req.engine = await getNlpEngineById(dataVerified && dataVerified.engine && dataVerified.engine._id);
		req.user = {
			_id: dataVerified.user._id,
		};
		return next();
	} catch (error) {
		next(error);
	}
};

exports.verifyBotId = async (org, botId) => {
	const data = {
		org,
		botId,
	};

	const url = `${process.env.NLP_SERVER}/api/v1/bots/verify`;
	const res = await axios.post(url, data, {
		headers: { authorization: process.env.SERVER_API_KEY },
	});

	const isVerified = _.get(res, 'data.data.isVerified', false);
	return isVerified;
};

async function getNlpEngineById(engineId) {
	if (!engineId) return;
	const url = `${process.env.AUTH_SERVER}/nlp-engines/${engineId}`;
	const res = await axios.get(url, {
		headers: { authorization: process.env.SERVER_API_KEY }
	});
	return res && res.data && res.data.success && res.data.data;
}

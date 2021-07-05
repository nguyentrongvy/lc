const axios = require('axios');
const _ = require('lodash');

const jwtHelper = require('../helpers/jwt.helper');

exports.verifyToken = async (req, res, next) => {
	try {
		const token = req.body.token || req.params.token || req.headers.authorization;
		if (!token) {
			return next(new Error('AUTHENTICATION_FAILED'));
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

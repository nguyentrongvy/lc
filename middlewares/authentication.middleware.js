const jwtHelper = require('../helpers/jwt.helper');
const axios = require('axios');

exports.verifyToken = async (req, res, next) => {
	const token = req.body.token || req.params.token || req.headers.authorization;
	if (!token) {
		return next(new Error('AUTHENTICATION_FAILED'));
	}

	if (token == process.env.SERVER_API_KEY) {
		req.nlpEngine = {
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
	req.nlpEngine = await getNlpEngineById(dataVerified && dataVerified.engine && dataVerified.engine._id);
	req.user = {
		_id: dataVerified.user._id,
	};
	return next();
};

async function getNlpEngineById(engineId) {
	if (!engineId) return;
	const url = `${process.env.AUTH_SERVER}/nlp-engines/${engineId}`;
	const res = await axios.get(url, {
		headers: { authorization: process.env.SERVER_API_KEY }
	});
	return res && res.data && res.data.success && res.data.data;
}

const _ = require('lodash');
const axios = require('axios');
const tokenHelper = require('../helpers/token.helper');

exports.verifyToken = async (req, res, next) => {
	const token = tokenHelper.getTokenFromRequest(req);
	if (!token) return next(new Error('INVALID_TOKEN'));

	req.appName = req.headers['app-name'];
	req.userAgent = req.headers['user-agent'];

	if (token == process.env.SERVER_API_KEY) {
		handleServerApiKey(req);
		return next();
	}

	if (!token.startsWith('Bearer')) return next(new Error('INVALID_TOKEN'));

	req.accessToken = token.substr(7, token.length - 7);
	const data = await tokenHelper.verifyToken(req.accessToken, req.userAgent, req.appName, req.headers.origin);
	if (!data) return next(new Error('INVALID_TOKEN'));

	req.engine = data.engine;
	req.user = data.user;
	req.org = data.org;

	if (!req.engine || !req.engine._id) {
		req.engine = { _id: req.headers.engineid };
	}

	return next();
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

async function handleServerApiKey(req) {
	req.engine = {
		_id: req.headers.engineid,
		isTwoChannels: req.headers.istwochannels === 'true',
		isMultiIntents: req.headers.ismultiintents === 'true',
	};
	req.user = {
		_id: req.headers.userid,
		isSystemAdmin: req.headers.issystemadmin === 'true',
	};
	req.org = {
		_id: req.headers.orgid,
	};
}

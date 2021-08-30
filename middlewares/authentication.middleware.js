const _ = require('lodash');
const axios = require('axios');
const { APP_NAME, COOKIE_NAME } = require('../common/constants');

exports.verifyToken = async (req, res, next) => {
	const token = req.headers.authorization || getTokenFromCookie(req);
	if (!token) return next(new Error('INVALID_TOKEN'));

	req.appName = req.headers['app-name'];
	req.userAgent = req.headers['user-agent'];

	if (token == process.env.SERVER_API_KEY) {
		handleServerApiKey(req);
		return next();
	}

	if (!token.startsWith('Bearer')) return next(new Error('INVALID_TOKEN'));

	req.accessToken = token.substr(7, token.length - 7);
	const data = await verifyToken(req.accessToken, req.userAgent, req.appName, req.headers.origin);
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

async function verifyToken(token, userAgent, appName, origin) {
	try {
		if (!token) return;

		const res = await axios.post(`${process.env.AUTH_SERVER}/auth/token/verify`, { token }, {
			headers: {
				origin,
				authorization: process.env.SERVER_API_KEY,
				'user-agent': userAgent,
				'app-name': appName,
			}
		});
		return res && res.data && res.data.data;
	} catch (err) {
		logger.error(err);
	}
}

function getTokenFromCookie(req) {
	const appName = req.headers['app-name'];
	if (!appName) return;

	const cookieName = getCookieNameByAppName(appName);
	if (!cookieName) return;

	const token = req.cookies[cookieName];
	if (!token) return;

	return `Bearer ${token}`;
}

function getCookieNameByAppName(appName) {
	switch (appName) {
		case APP_NAME.Admin: return COOKIE_NAME.Admin;
		case APP_NAME.VirtualAgent: return COOKIE_NAME.VirtualAgent;
		case APP_NAME.VirtualQC: return COOKIE_NAME.VirtualQC;
		case APP_NAME.LiveChat: return COOKIE_NAME.LiveChat;
		case APP_NAME.Labelbox: return COOKIE_NAME.Labelbox;
	}
}

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

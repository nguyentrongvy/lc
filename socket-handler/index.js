const _ = require('lodash');
const axios = require('axios');
const cookie = require('cookie');
const { initialize } = require('./initialize-socket');
const { ERROR, APP_NAME, COOKIE_NAME } = require('../common/constants');
const { verifyBotId } = require('../middlewares/authentication.middleware');

async function authenticationUser(socket, next) {
	try {
		const { botId } = socket.handshake.query;
		if (!botId) throw new Error(ERROR.BOT_ID_IS_REQUIRED);

		// TODO: Hotfix for Soby. Need to update in the future.
		const token = getTokenFromCookie(socket) || _.get(socket, 'handshake.query.token');
		if (!token) throw new Error(ERROR.INVALID_TOKEN);

		const userAgent = _.get(socket, 'request.headers["user-agent"]');
		const appName = _.get(socket, 'handshake.query.appName');
		const origin = _.get(socket, 'request.headers.origin');
		
		const res = await axios({
			url: `${process.env.AUTH_SERVER}/auth/token/verify`,
			method: 'POST',
			headers: {
				origin,
				authorization: process.env.SERVER_API_KEY,
				'user-agent': userAgent,
				'app-name': appName,
			},
			data: {
				token,
			},
		});

		const data = res && res.data && res.data.data;
		if (!data) throw new Error(ERROR.INVALID_TOKEN);

		const isVerified = await verifyBotId(_.get(data, 'org._id'), botId);
		if (!isVerified) {
			throw new Error('Bot is not belong to organization');
		}

		socket.user = data.user;
		socket.org = data.org;
		socket.engine = {
			_id: botId,
		};
		return next();
	} catch (error) {
		return next(error);
	}
}

function getTokenFromCookie(socket) {
	const cookies = cookie.parse(_.get(socket, 'handshake.headers.cookie', ''));
	if (!cookies) return;

	const appName = _.get(socket, 'handshake.query.appName');
	if (!appName) return;

	const cookieName = getCookieNameByAppName(appName);
	if (!cookieName) return;

	return cookies[cookieName];
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

exports.load = (io) => {
	io.use(authenticationUser);

	initialize(io);
};

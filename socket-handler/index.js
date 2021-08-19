const _ = require('lodash');
const axios = require('axios');
const { initialize } = require('./initialize-socket');
const { ERROR, AppName } = require('../common/constants');
const { verifyBotId } = require('../middlewares/authentication.middleware');

async function authenticationUser(socket, next) {
	try {
		const { token, botId } = socket.handshake.query;
		if (!token) throw new Error(ERROR.INVALID_TOKEN);

		const res = await axios({
			url: `${process.env.AUTH_SERVER}/auth/token/verify`,
			method: 'POST',
			headers: {
				authorization: process.env.SERVER_API_KEY,
			},
			data: {
				token: `Bearer ${token}`,
				appName: AppName.LiveChat,
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

exports.load = (io) => {
	io.use(authenticationUser);

	initialize(io);
};

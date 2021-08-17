const _ = require('lodash');
const axios = require('axios');
const { initialize } = require('./initialize-socket');
const jwtHelper = require('../helpers/jwt.helper');
const { ERROR, TokenType } = require('../common/constants');
const { verifyBotId } = require('../middlewares/authentication.middleware');

async function authenticationUser(socket, next) {
	try {
		const { token, botId } = socket.handshake.query;
		if (!token) throw new Error(ERROR.INVALID_TOKEN);
		const data = jwtHelper.verifyToken(token);

		if (data.type != TokenType.User) throw new Error(ERROR.INVALID_TOKEN);

		const res = await axios({
			url: `${process.env.AUTH_SERVER}/users/${data.userId}`,
			method: 'GET',
			headers: {
				authorization: process.env.SERVER_API_KEY,
			},
		});

		const user = res && res.data && res.data.data;

		const org = _.get(user, 'org._id');
		const isVerified = await verifyBotId(org, botId);
		if (!isVerified) {
			throw new Error('Bot is not belong to organization');
		}

		socket.user = user;
		socket.org = user && user.org;
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

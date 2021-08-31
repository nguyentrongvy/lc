const _ = require('lodash');
const { initialize } = require('./initialize-socket');
const { ERROR } = require('../common/constants');
const { verifyBotId } = require('../middlewares/authentication.middleware');
const tokenHelper = require('../helpers/token.helper');

async function authenticationUser(socket, next) {
	try {
		const { botId } = socket.handshake.query;
		if (!botId) throw new Error(ERROR.BOT_ID_IS_REQUIRED);

		const token = tokenHelper.getTokenFromSocket(socket);
		if (!token) throw new Error(ERROR.INVALID_TOKEN);

		const userAgent = _.get(socket, 'request.headers["user-agent"]');
		const appName = _.get(socket, 'handshake.query.appName');
		const origin = _.get(socket, 'request.headers.origin');

		const data = await tokenHelper.verifyToken(token, userAgent, appName, origin);
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

const _ = require('lodash');
const { initialize } = require('./initialize-socket');
const jwtHelper = require('../helpers/jwt.helper');
const Constants = require('../common/constants');
const { verifyBotId } = require('../middlewares/authentication.middleware');

async function authenticationUser(socket, next) {
	try {
		const { token, botId } = socket.handshake.query;
		if (!token) {
			return next(new Error(Constants.ERROR.INVALID_TOKEN));
		}
		const verifiedData = jwtHelper.verifyToken(token);
		const org = _.get(verifiedData, 'org._id');
		const isVerified = await verifyBotId(org, botId);
		if (!isVerified) {
			throw new Error('Bot is not belong to organization');
		}

		socket.user = verifiedData.user;
		socket.engine = {
			_id: botId,
		};
		return next();
	} catch (error) {
		console.error(error);
		return next(error);
	}
}

exports.load = (io) => {
	io.use(authenticationUser);

	initialize(io);
};

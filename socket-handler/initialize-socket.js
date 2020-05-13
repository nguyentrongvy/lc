const message = require('./message');
const { hmSetToRedis } = require('../services/redis.service');
const Constants = require('../common/constants');

exports.initialize = (io) => {
	io.on('connection', async function (socket) {
		try {
			const userId = socket.user._id;
			const engineId = socket.engine._id;
			socket.join(userId);
			socket.join(engineId);
			await setStatusToRedis(engineId, true);
			// ----------------------
			// ------INIT EVENT------
			// ----------------------
			message.initEvent(socket);

			socket.on('disconnect', async function () {
				try {
					const countMultiDevicesOnline = numClientsInRoom(io, '/', engineId);
					if (countMultiDevicesOnline === 0) {
						await setStatusToRedis(engineId, false);
					}
				} catch (error) {
					console.error(error);
				}
			});
		} catch (error) {
			console.error(error);
		}
	});
};

function numClientsInRoom(io, namespace, room) {
	const clients = io.nsps[namespace].adapter.rooms[room];
	if (!clients) {
		return 0;
	}
	return clients.length; // number clients in room
}

function setStatusToRedis(engineId, status) {
	return hmSetToRedis(Constants.REDIS.HASHMAP.STATUS, engineId.toString(), status);
}

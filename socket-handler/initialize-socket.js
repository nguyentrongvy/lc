const message = require('./message');

exports.initialize = (io) => {
	io.on('connection', async function (socket) {
		try {
			const userId = socket.user._id;
			const engineId = socket.engine._id;
			socket.join(userId);
			socket.join(engineId);
			const countMultiDevicesOnline = numClientsInRoom(io, '/', userId);
			if (countMultiDevicesOnline === 1) {
				socket.broadcast.emit('status', {
					action: 'ONLINE',
					data: userId
				});
			}
			// ----------------------
			// ------INIT EVENT------
			// ----------------------
			message.initEvent(socket);

			socket.on('disconnect', async function () {
				try {
					const countMultiDevicesOnline = numClientsInRoom(io, '/', userId);
					if (countMultiDevicesOnline === 0) {
						socket.broadcast.emit('status', {
							action: 'OFFLINE',
							data: userId
						});
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

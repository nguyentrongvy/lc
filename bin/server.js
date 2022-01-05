const http = require('http');
const socketio = require('socket.io');
const redisAdapter = require('socket.io-redis');
const appExpress = require('../app');
const idleRoomConsumer = require('../jobs/room/idle-room-consumer');
const { REDIS_OPTIONS } = require('../common/redis-options');

exports.start = (serverSettings) => new Promise((resolve) => {
	const app = appExpress(serverSettings);
	const server = http.createServer(app);

	const io = socketio(server);
	io.adapter(redisAdapter(REDIS_OPTIONS));
	const socketHandler = require('../socket-handler');
	socketHandler.load(io);

	const { port } = serverSettings;
	server.listen(port, () => resolve(server));

	idleRoomConsumer.addProcessJobs();
});

const http = require('http');
const socketio = require('socket.io');
const redisAdapter = require('socket.io-redis');
const appExpress = require('../app');

exports.start = (serverSettings) => new Promise((resolve) => {
	const app = appExpress(serverSettings);
	const server = http.createServer(app);
	
	const io = socketio(server);
	io.adapter(redisAdapter(process.env.REDIS_HOST));
	const socketHandler = require('../socket-handler');
	socketHandler.load(io);

	const { port } = serverSettings;
	server.listen(port, () => resolve(server));
});

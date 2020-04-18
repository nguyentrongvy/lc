const messageController = require('../controllers/message.controller');
const authenMiddleware = require('../middlewares/authentication.middleware');

exports.load = (app) => {
	app.post('/api/v1/messages', messageController.sendMessage);
	app.get('/api/v1/room/:roomID/messages', messageController.getMessagesByRoomID);
};
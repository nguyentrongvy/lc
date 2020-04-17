const messageController = require('../controllers/message.controller');
const authenMiddleware = require('../middlewares/authentication.middleware');

exports.load = (app) => {
	app.post('/api/v1/messages', authenMiddleware.verifyToken, messageController.sendMessage);
};
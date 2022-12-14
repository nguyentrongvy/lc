const validate = require('express-validation');

const messageValidation = require('../validations/message.validation');
const messageController = require('../controllers/message.controller');
const authenMiddleware = require('../middlewares/authentication.middleware');

exports.load = (app) => {
	app.post(
		'/api/v1/messages',
		[
			validate(messageValidation.sendMessage()),
			authenMiddleware.verifyToken,
		],
		messageController.sendMessage,
	);
	app.get(
		'/api/v1/chat-histories',
		[
			authenMiddleware.verifyToken,
			validate(messageValidation.lastMessage()),
			validate(messageValidation.getChatHistoriesValidate()),
		],
		messageController.getChatHistories,
	);
	app.get(
		'/api/v1/rooms/:id/messages',
		[
			validate(messageValidation.lastMessage()),
			authenMiddleware.verifyToken,
		],
		messageController.getMessagesByRoomID,
	);
	app.get(
		'/api/v1/rooms/:id/messages/keyword',
		[
			authenMiddleware.verifyToken,
		],
		messageController.getMessagesByKeyWord
	)
};
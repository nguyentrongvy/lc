const validate = require('express-validation');

const messageValidation = require('../validations/message.validation');
const commonValidation = require('../validations/common.validation');
const messageController = require('../controllers/message.controller');
const authenMiddleware = require('../middlewares/authentication.middleware');

exports.load = (app) => {
	app.post(
		'/api/v1/messages',
		[
			validate(messageValidation.sendMessage()),
			// authenMiddleware.verifyToken,
		],
		messageController.sendMessage,
	);
	app.get(
		'/api/v1/rooms/:id/messages',
		[
			validate(commonValidation.paramId()),
			validate(commonValidation.pagination()),
			// authenMiddleware.verifyToken,
		],
		messageController.getMessagesByRoomID,
	);
};
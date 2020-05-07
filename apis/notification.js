const validate = require('express-validation');

const notificationController = require('../controllers/notification.controller');
const notificationValidation = require('../validations/notification.validation');
const commonValidation = require('../validations/common.validation');
const authenMiddleware = require('../middlewares/authentication.middleware');

exports.load = (app) => {
	app.get(
		'/api/v1/notifications',
		[
			validate(notificationValidation.lastNotification()),
			authenMiddleware.verifyToken,
		],
		notificationController.getListNotification,
	);
	app.get(
		'/api/v1/notifications/count',
		[
			authenMiddleware.verifyToken,
		],
		notificationController.countNotification,
	);
	app.post(
		'/api/v1/notifications',
		[
			validate(notificationValidation.createNotification()),
			authenMiddleware.verifyToken,
		],
		notificationController.createNotification,
	);
	app.put(
		'/api/v1/notifications/:id',
		[
			validate(commonValidation.paramId()),
			authenMiddleware.verifyToken,
		],
		notificationController.handleNotification,
	);
};
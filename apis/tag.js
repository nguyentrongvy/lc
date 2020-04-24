const validate = require('express-validation');

const tagController = require('../controllers/tag.controller');
const authenMiddleware = require('../middlewares/authentication.middleware');

exports.load = (app) => {
	app.get(
		'/api/v1/tags',
		[
			authenMiddleware.verifyToken,
		],
		tagController.getAll,
	);
};
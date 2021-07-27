const validate = require('express-validation');

const tagController = require('../controllers/tag.controller');
const authenMiddleware = require('../middlewares/authentication.middleware');
const { validateTag } = require('../validations/tag.validation');

exports.load = (app) => {
	app.get(
		'/api/v1/tags',
		[
			authenMiddleware.verifyToken,
		],
		tagController.getAll,
	);
	app.post('/api/v1/tags', [
		validate(validateTag()),
		authenMiddleware.verifyToken,
	], tagController.createTags);
};
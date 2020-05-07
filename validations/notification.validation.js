const Joi = require('@hapi/joi');
const Constants = require('../common/constants');

exports.lastNotification = () => ({
	query: {
		lastNotification: Joi.string().regex(Constants.REGEX.OBJECT_ID),
	},
});

exports.createNotification = () => ({
	body: {
		content: Joi.string().max(5000, 'utf8').required(),
		type: Joi.string().valid(Object.values(Constants.NOTIFICATION.TYPES)),
		botUser: Joi.object().keys({
			_id: Joi.string().regex(Constants.REGEX.OBJECT_ID).required(),
			name: Joi.string().allow(''),
		}).required(),
		channel: Joi.string().valid(...Object.values(Constants.CHANNEL)).required(),
	},
});

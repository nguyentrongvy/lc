const Joi = require('joi');
const Constants = require('../common/constants');

exports.queryGetRooms = () => ({
	query: {
		lastRoom: Joi.string().regex(Constants.REGEX.OBJECT_ID),
	}
});

exports.roomValidation = () => ({
	body: {
		orgId: Joi.string().regex(Constants.REGEX.OBJECT_ID).required(),
		engineId: Joi.string().regex(Constants.REGEX.OBJECT_ID).required(),
		botUser: Joi.object().keys({
			_id: Joi.string().regex(Constants.REGEX.OBJECT_ID).required(),
			name: Joi.string().required().default(Constants.CHAT_CONSTANTS.DEFAULT_NAME),
		}).required(),
		channel: Joi.string().valid(...Object.values(Constants.CHANNEL)).required(),
	},
});

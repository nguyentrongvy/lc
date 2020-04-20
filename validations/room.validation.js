const Joi = require('@hapi/joi');
const Constants = require('../common/constants');

exports.queryGetRooms = () => ({
	query: {
		lastRoom: Joi.string().regex(Constants.REGEX.OBJECT_ID).required(),
	}
});

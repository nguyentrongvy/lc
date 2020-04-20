const Joi = require('@hapi/joi');
const Constants = require('../common/constants');

exports.sendMessage = () => ({
	body: {
		botUser: Joi.string().regex(Constants.REGEX.OBJECT_ID).required(),
		nlpEngine: Joi.string().regex(Constants.REGEX.OBJECT_ID).required(),
		content: Joi.string().max(10000, 'utf8').required(),
		channel: Joi.string().valid(...Object.values(Constants.CHANNEL)).required(),
		intents: Joi.array().items(Joi.string().regex(Constants.REGEX.OBJECT_ID)),
		entities: Joi.object().pattern(/.*/, Joi.array().items(Joi.object().pattern(/.*/, [Joi.string(), Joi.number()]))),
		responses: Joi.array().items(Joi.object()),
	}
});

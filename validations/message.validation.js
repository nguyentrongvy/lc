const Joi = require('@hapi/joi');
const Constants = require('../common/constants');

exports.sendMessage = () => ({
	body: {
		botUser: Joi.object().keys({
			name: Joi.string().allow(''),
			_id: Joi.string().regex(Constants.REGEX.OBJECT_ID).required(),
		}),
		masterBot: Joi.string().regex(Constants.REGEX.OBJECT_ID).required(),
		content: Joi.string().max(10000, 'utf8').required(),
		channel: Joi.string().valid(...Object.values(Constants.CHANNEL)).required(),
		intents: Joi.array().items(Joi.object().pattern(/.*/, [Joi.string(), Joi.number(), ''])),
		entities: Joi.object().pattern(/.*/, Joi.array().items(Joi.object())),
		responses: Joi.array().items(Joi.object()),
		pageId: Joi.string().allow(''),
		faqResponses: Joi.array().items(Joi.object()),
	},
});

exports.lastMessage = () => ({
	query: {
		lastMessage: Joi.string().regex(Constants.REGEX.OBJECT_ID),
	}
});

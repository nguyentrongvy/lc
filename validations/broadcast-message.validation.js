const Joi = require('joi');
const Constants = require('../common/constants');

exports.broadcastMessage = () => ({
  body: {
    channel: Joi.string().valid(...Object.values(Constants.CHANNEL)).required(),
    pageId: Joi.string().required(),
    responses: Joi.array().items(Joi.string()),
    userId: Joi.string().allow(''),
    tags: Joi.array().items(Joi.string()),
    message_type: Joi.string().valid(...Object.values(Constants.BROADCAST_MESSAGE_TYPE)).allow(''),
    tag: Joi.string().valid(...Object.values(Constants.FACEBOOK_MESSAGE_TAG)).allow(''),
    lastActiveDate: Joi.string().required(),
  },
});

exports.paramId = () => ({
	params: {
		id: Joi.string().regex(Constants.REGEX.OBJECT_ID),
	},
});
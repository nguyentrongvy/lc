const Joi = require('@hapi/joi');
const Constants = require('../common/constants');

exports.broadcastMessage = () => ({
  body: {
    channel: Joi.string().valid(...Object.values(Constants.CHANNEL)).required(),
    pageId: Joi.string(),
    responses: Joi.array().items(Joi.string()).required(),
    userId: Joi.string(),
    tags: Joi.array().items(Joi.string()),
    message_type: Joi.string().valid(...Object.values(Constants.BROADCAST_MESSAGE_TYPE)),
    tag: Joi.string().valid(...Object.values(Constants.FACEBOOK_MESSAGE_TAG)),
  },
});
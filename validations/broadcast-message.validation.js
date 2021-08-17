const Joi = require('joi');
const Constants = require('../common/constants');

exports.broadcastMessage = () => ({
  body: {
    channel: Joi.string().valid(...Object.values(Constants.CHANNEL)).required(),
    pageId: Joi.string(),
    responses: Joi.array().items(Joi.string()),
    userId: Joi.string(),
    tags: Joi.array().items(Joi.string()),
    message_type: Joi.string().valid(...Object.values(Constants.BROADCAST_MESSAGE_TYPE)),
    tag: Joi.string().valid(...Object.values(Constants.FACEBOOK_MESSAGE_TAG)),
    lastActiveDate: Joi.string().required(),
  },
});
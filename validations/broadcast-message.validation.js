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

exports.sendMessage = () => ({
  body: {
    responses: Joi.array().items(Joi.object()).required(),
    tag: Joi.string().min(1, 'utf-8').max(100, 'utf-8').allow(''),
    sentUsers: Joi.array().items(Joi.object()).required(),
    engineId: Joi.string().regex(Constants.REGEX.OBJECT_ID).required(),
    message: Joi.object().required(),
  },
});

exports.paramId = () => ({
  params: {
    id: Joi.string().regex(Constants.REGEX.OBJECT_ID),
  },
});

exports.getUsers = () => ({
  query: {
    lastActiveDate: Joi.string().allow(''),
    channel: Joi.string().valid(...Object.values(Constants.CHANNEL)).required(),
    pageId: Joi.string().required(),
    gender: Joi.string().allow(''),
  },
});
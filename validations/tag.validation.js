const Joi = require('joi');

exports.validateTag = () => ({
    body: {
        tags: Joi.array().items(Joi.string().min(1, 'utf-8').max(100, 'utf-8')).required(),
    },
});
const Joi = require('@hapi/joi');
const Constants = require('../common/constants');

const paramId = () => ({
	params: {
		id: Joi.string().regex(Constants.REGEX.OBJECT_ID),
	},
});

const pagination = () => ({
	query: {
		page: Joi.number().integer().min(1),
		limit: Joi.number().integer().min(1),
	},
});

module.exports = {
	paramId,
	pagination,
};

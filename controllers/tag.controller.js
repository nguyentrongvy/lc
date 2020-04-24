const { ResponseSuccess } = require('../helpers/response.helper');
const tagService = require('../services/tag.service');
const Constants = require('../common/constants');

class TagControlelr {
    async getAll(req, res, next) {
        try {
            const result = await tagService.getAll();
            return ResponseSuccess(Constants.SUCCESS.GET_TAGS, result, res);
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new TagControlelr();
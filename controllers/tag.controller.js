const { ResponseSuccess } = require('../helpers/response.helper');
const tagService = require('../services/tag.service');
const Constants = require('../common/constants');

class TagControlelr {
    async getAll(req, res, next) {
        try {
            const engineId = req.engine._id;
            const result = await tagService.getAll(engineId);
            return ResponseSuccess(Constants.SUCCESS.GET_TAGS, result, res);
        } catch (error) {
            next(error);
        }
    }

    async createTags(req, res, next) {
        try {
            const engineId = req.engine._id;
            const { tags } = req.body;
            const result = await tagService.createTags(engineId, tags);

            return ResponseSuccess('', result, res);
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new TagControlelr();
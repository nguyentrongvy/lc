const broadcastResponseService = require('../services/broadcast-response.service');
const { ResponseSuccess, ResponseError } = require('../helpers/response.helper');
const logger = require('../services/logger');
const { SUCCESS } = require('../common/constants');

class BroadcastMessageController {
  async create(req, res, next) {
    try {
      const engineId = req.engine._id;
      const data = req.body;
      const orgId = req.org._id;
      const result = await broadcastResponseService.createBroadcastResponse(data, engineId, orgId);
      return ResponseSuccess(SUCCESS.CREATE_RESPONSE_SUCCESS, result, res);
    } catch (err) {
      logger.error(err);
      next(err);
    }
  }

  async getBroadcastResponses(req, res, next) {
    try {
      const engineId = req.engine._id;
      const data = req.body;
      const orgId = req.org._id;
      const result = await broadcastResponseService.getBroadcastResponseByEngineId(engineId, orgId);

      return ResponseSuccess(SUCCESS.GET_RESPONSE_SUCCESS, result, res);
    } catch (error) {
      logger.error(error);
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const engineId = req.engine._id;
      const data = req.body;
      const orgId = req.org._id;
      const result = await broadcastResponseService.updateBroadcastResponse(data, engineId, orgId);
      
      return ResponseSuccess(SUCCESS.CREATE_RESPONSE_SUCCESS, result, res);
    } catch (err) {
      logger.error(err);
      next(err);
    }
  }
}

module.exports = new BroadcastMessageController();
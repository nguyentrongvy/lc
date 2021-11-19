const broadcastMessageService = require('../services/broadcast-message.service');
const { ResponseSuccess, ResponseError } = require('../helpers/response.helper');
const { broadcastMessageRepository } = require('../repositories/index');
const logger = require('../services/logger');
const Constants = require('../common/constants');

class BroadcastMessageController {
  async getById(req, res, next) {
    try {
      const engineId = req.engine._id;
      const orgId = req.org._id;
      const id = req.params.id;
      const result = await broadcastMessageService.getById(id, engineId, orgId);
      return ResponseSuccess('GET_RESPONSE_SUCCESS', result, res);
    } catch (err) {
      logger.error(err);
      return ResponseError(err.message, res);
    }
  }

  async create(req, res, next) {
    try {
      const engineId = req.engine._id;
      const data = req.body;
      const orgId = req.org._id;
      const result = await broadcastMessageService.createBroadcastMessage(data, engineId, orgId);
      return ResponseSuccess('UPDATE_RESPONSE_SUCCESS', result, res);
    } catch (err) {
      next(err);
    }
  }

  async createBroadcastMessages(req, res, next) {
    try {
      const engineId = req.engine._id;
      const data = req.body;
      const orgId = req.org._id;
      const shoudAddParam = req.query.shoudAddParam;
      const result = await broadcastMessageService.createBroadcastMessageCustomer(data, engineId, orgId, shoudAddParam);
      return ResponseSuccess(Constants.SUCCESS.BROADCAST_CUSTOMER_API, result, res);
    } catch (err) {
      next(err);
    }
  }

  async updateById(req, res, next) {
    try {
      const id = req.params.id;
      const engineId = req.engine._id;
      const orgId = req.org._id;
      const data = req.body;
      const result = await broadcastMessageService.updateBroadcastMessage(id, data, engineId, orgId, true);
      return ResponseSuccess('UPDATE_RESPONSE_SUCCESS', result, res);
    } catch (err) {
      next(err);
    }
  }

  async deleteById(req, res, next) {
    try {
      const id = req.params.id;
      const orgId = req.org._id;
      const engineId = req.engine._id;
      const result = await broadcastMessageService.deleteById(id, engineId, orgId);
      return ResponseSuccess('DELETE_RESPONSE_SUCCESS', result, res);
    } catch (err) {
      logger.error(err);
      return ResponseError(err.message, res);
    }
  }

  async getListProactiveMessages(req, res, next) {
    try {
      const engineId = req.engine._id;
      const {
        search,
        page,
        length,
        sort,
        sortField,
        type,
      } = req.query;
      const condition = {
        $and: [
          {
            engineId,
          }
        ]
      };
      if (search) {
        condition.$and.push(
          {
            name: new RegExp(search, 'i')
          },
        );
      }
      let sortCondition = {};
      if (sortField) {
        sortCondition = {
          [sortField]: sort,
        }
      } else {
        sortCondition = {
          updatedAt: -1,
        }
      }

      const [totalData, responses] = await Promise.all([
        broadcastMessageRepository.count(condition),
        broadcastMessageRepository.getMany({
          limit: parseInt(length),
          page: parseInt(page),
          where: condition,
          sort: sortCondition,
        })
      ]);

      return res.json({
        success: true,
        data: responses,
        recordsTotal: totalData,
        recordsFiltered: totalData
      });
    } catch (error) {
      next(error);
    }
  }

  async updateBroadcastMessageCustomer(req, res, next) {
    try {
      const id = req.params.id;
      const engineId = req.engine._id;
      const orgId = req.org._id;
      const data = req.body;
      const result = await broadcastMessageService.updateBroadcastMessageCustomer({ id, data, engineId, orgId });
      return ResponseSuccess('UPDATE_RESPONSE_SUCCESS', result, res);
    } catch (error) {
      logger.error(error);
      next(error);
    }
  }

  async sendMessage(req, res) {
    try {
      const {
        message,
        responses,
        engineId,
        sentUsers,
        tag,
      } = req.body;

      await broadcastMessageService.handleMessage({
        message,
        responses,
        engineId,
        sentUsers,
        tag,
      });
      return ResponseSuccess('', '', res);
    } catch (error) {
      logger.error(error);
      return ResponseError(error.message, res);
    }
  }

  async getSentUsers(req, res) {
    try {
      const { lastActiveDate, channel, pageId, gender, tags } = req.query;
      const engineId = req.engine._id;

      const result = await broadcastMessageService.getSentUsers({ lastActiveDate, channel, pageId, gender, engineId, tags });
      return ResponseSuccess('', result, res);
    } catch (error) {
      logger.error(error);
      return ResponseError(error.message, res);
    }
  }

  async stopBroadcast(req, res) {
    try {
      const engineId = req.engine._id;
      const id = req.params.id;
      const name = req.body.name;
      await broadcastMessageService.stopBroadcast({ engineId, name, id });

      return ResponseSuccess('', '', res);
    } catch (error) {
      logger.error(error);
      return ResponseError(error.message, res);
    }
  }
}

module.exports = new BroadcastMessageController();
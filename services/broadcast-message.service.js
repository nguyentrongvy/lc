const { broadcastMessageRepository } = require('../repositories');
const { ERROR, ERROR_CODE, REDIS, CHANNEL } = require('../common/constants');
const messageService = require('./message.service');
const responseService = require('./response.service');
const botUserService = require('./bot-user.service');
const redisService = require('./redis.service');
const roomService = require('./room.service');
const logger = require('./logger/index');
const botService = require('./bot.service');
const _ = require('lodash');
const { setExToRedis } = require('./redis.service');

class BroadcastMessageService {
  async updateBroadcastMessage(id, data, engineId, orgId) {
    if (!id || !data || !data.name || !engineId || !orgId) throw new Error(ERROR.DATA_ERROR);

    const isDuplicated = await this.checkDuplicateMessageByName(data.name, engineId, orgId, id);
    if (isDuplicated) throw new Error(ERROR_CODE.EXISTED_BROADCAST_MESSAGE);

    const options = {
      where: {
        _id: id,
        engineId,
        orgId,
      },
      data,
    };
    await broadcastMessageRepository.updateOne(options);
  }

  async createBroadcastMessage(data, engineId, orgId) {
    if (!data || !data.name || !engineId || !orgId) throw new Error(ERROR.DATA_ERROR);

    const isDuplicated = await this.checkDuplicateMessageByName(data.name, engineId, orgId);
    if (isDuplicated) throw new Error(ERROR_CODE.EXISTED_BROADCAST_MESSAGE);

    data.orgId = orgId;
    data.engineId = engineId;

    const message = await broadcastMessageRepository.create(data);

    if (message.isAsap) {
      try {
        await this.sendBroadcastMessage(message, engineId, orgId);
      } catch (error) {
        logger.error(error);
      }
      return;
    }

    if (!message.isAsap) {
      try {
        if (!message.scheduleTime) {
          message.sentMessages = 0;
          await updateBroadcastMessage(message._id, message, engineId, orgId);
          return;
        };

        const now = new Date().getTime();
        const setDate = new Date(message.scheduleTime).getTime();
        if (isNaN(setDate) || isNaN(now)) {
          message.sentMessages = 0;
          await updateBroadcastMessage(message._id, message, engineId, orgId);
          return;
        }

        const time = parseInt((setDate - now) / 1000);
        if (time <= 0 && time > -1000) {
          await this.sendBroadcastMessage(message, engineId, orgId);
          return;
        }

        if (time < -1000) {
          message.sentMessages = 0;
          await updateBroadcastMessage(message._id, message, engineId, orgId);
          return;
        }

        setExToRedis(`${REDIS.PREFIX.BROADCAST_MESSAGE}${engineId}_${orgId}_${message._id}`, parseInt(time), true);
      } catch (error) {
        logger.error(error);
      }
    }
  }

  async getById(id, engineId, orgId) {
    if (!id || !engineId || !orgId) throw new Error(ERROR.DATA_ERROR);

    const options = {
      where: {
        _id: id,
        engineId,
        orgId,
      },
    };

    return await broadcastMessageRepository.getOne(options);
  }

  async deleteById(id, engineId, orgId) {
    if (!id || !engineId || !orgId) throw new Error(ERROR.DATA_ERROR);

    return await broadcastMessageRepository.deleteOne({
      _id: id,
      engineId,
      orgId,
    });
  }

  async checkDuplicateMessageByName(name, engineId, orgId, id) {
    const options = {
      where: {
        name,
        engineId,
        _id: { $ne: id },
        orgId,
      },
    };
    const message = await broadcastMessageRepository.getOne(options);
    return !!message;
  }


  async sendBroadcastMessage(message, engineId, orgId) {
    try {
      if (!message) return;

      if (!message.responses || message.responses.length == 0) {
        message.sentMessages = 0;
        return;
      };


      const botUsersPromise = botUserService.getBotUserByEngineId(engineId);
      const responsesPromise = responseService.getByIds(message.responses, engineId);
      const botPromise = botService.getBotByEngineId(engineId);
      const [botUsers, responses, bot] = await Promise.all([botUsersPromise, responsesPromise, botPromise]);
      let botChannel = _.get(bot, `channels.${message.channel}`);
      if (message.channel == CHANNEL.FB) {
        if (!botChannel.isActive) botChannel = _.get(bot, `channels.${CHANNEL.Messenger}`);
      }

      if (!botChannel || !botChannel.isActive) {
        message.sentMessages = 0;
        await this.updateBroadcastMessage(message._id, message, engineId, orgId);
        return;
      }

      if (!responses || responses.length == 0 || !botUsers || botUsers.length == 0) {
        message.sentMessages = 0;
        await this.updateBroadcastMessage(message._id, message, engineId, orgId);
        return;
      };

      let sentUsers = botUsers.filter(u => {
        const channel = _.get(u, 'channel.name');
        if (channel != message.channel) return false;

        return true;
      });

      if (message.tags && message.tags.length > 0) {
        sentUsers = sentUsers.filter(u => {
          if (!u.tags || u.tags.length == 0) return false;

          for (const tag of u.tags) {
            const t = message.tags.find(t => t._id.toString() == tag._id.toString());
            if (t) return true;
          }

          return false;
        });
      }
      if (!sentUsers || sentUsers.length == 0) {
        message.sentMessages = 0;
        await this.updateBroadcastMessage(message._id, message, engineId, orgId);
        return;
      };

      const promise = sentUsers.map(u => sendMessage(u, responses, engineId));
      await Promise.all(promise);
      const sentMessages = sentUsers.filter(u => u.isSent);
      message.sentMessages = sentMessages && sentMessages.length || 0;
      await this.updateBroadcastMessage(message._id, message, engineId, orgId);
    } catch (error) {
      logger.error(error);
      const sentMessages = sentUsers.filter(u => u.isSent);
      message.sentMessages = sentMessages && sentMessages.length || 0;
      await this.updateBroadcastMessage(message._id, message, engineId, orgId);
    }
  }
}

module.exports = new BroadcastMessageService();

async function sendMessage(u, responses, engineId) {
  let sessionInfo;
  if (u.sessionId) {
    const parameterString = await redisService.getFromRedis(u.sessionId);
    if (parameterString) sessionInfo = JSON.stringify(parameterString);
  };
  const redisInfo = {
    userInfo: sessionInfo && sessionInfo.userInfo,
    queryResult: sessionInfo && sessionInfo.queryResult,
  }
  const allParameters = sessionInfo && sessionInfo.allParameters
  const replacedResponses = responses.map(r => {
    if (r.text && r.text.length > 0) r.text = responseService.getRandomResponseText(r.text, allParameters, redisInfo);
    return r;
  });
  const room = await roomService.getRoomByUserId(engineId, u._id);
  if (!room) {
    u.isSent = false;
    return;
  };

  u.isSent = true;
  messageService.sendMessageAuto({
    suggestions: {
      pageId: room.pageId,
      responses: [
        {
          channelResponses: replacedResponses,
        }
      ]
    },
    roomId: room._id,
    engineId,
    isProactiveMessage: true,
  });
}

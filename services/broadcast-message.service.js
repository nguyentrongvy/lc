const axios = require('axios');

const { broadcastMessageRepository } = require('../repositories');
const { ERROR, ERROR_CODE, REDIS, CHANNEL } = require('../common/constants');
const messageService = require('./message.service');
const broadcastResponseService = require('./broadcast-response.service');
const botUserService = require('./bot-user.service');
const { getFromRedis, setToRedis } = require('./redis.service');
const roomService = require('./room.service');
const logger = require('./logger/index');
const botService = require('./bot.service');
const _ = require('lodash');
const { delFromRedis } = require('./redis.service');
const scheduleService = require('./schedule.service');
const { processingScheduleTime } = require('./helpers');
const { getUsersQueue } = require('../message-queue/initQueue');

class BroadcastMessageService {
  async updateBroadcastMessage(id, data, engineId, orgId, isModified) {
    if (!id || !data || !data.name || !engineId || !orgId) throw new Error(ERROR.DATA_ERROR);

    const isDuplicated = await this.checkDuplicateMessageByName(data.name, engineId, orgId, id);
    if (isDuplicated) throw new Error(ERROR_CODE.EXISTED_BROADCAST_MESSAGE);

    if (!data.isSent && isModified) {
      const message = await this.getById(id, engineId, orgId);
      if (!message) return;

      if (message && !isNaN(message.sentMessages)) throw new Error(ERROR_CODE.SENT_BROADCAST_MESSAGE);
    }

    const options = {
      where: {
        _id: id,
        engineId,
        orgId,
      },
      data,
    };
    const editedMessage = await broadcastMessageRepository.getOneAndUpdate(options);
    if (isNaN(editedMessage.sentMessages) && isModified) {
      delFromRedis(`${REDIS.PREFIX.BROADCAST_MESSAGE}${engineId}_${orgId}_${editedMessage._id}`);
      await this.handleBroadcastMessage(editedMessage, engineId, orgId);
    }
  }

  async createBroadcastMessage(data, engineId, orgId) {
    if (!data || !data.name || !engineId || !orgId) throw new Error(ERROR.DATA_ERROR);

    const isDuplicated = await this.checkDuplicateMessageByName(data.name, engineId, orgId);
    if (isDuplicated) throw new Error(ERROR_CODE.EXISTED_BROADCAST_MESSAGE);

    data.orgId = orgId;
    data.engineId = engineId;

    const message = await broadcastMessageRepository.create(data);

    await this.handleBroadcastMessage(message, engineId, orgId);
  }

  async createBroadcastMessageCustomer(message, engineId, orgId, shoudAddParam) {
    if (!message || !engineId) throw new Error(ERROR.DATA_ERROR);
    if (!message.responses && !message.content) throw new Error(ERROR.DATA_ERROR);

    const broadcast = await broadcastMessageRepository.getOne({
      where: {
        engineId,
        name: message.name,
      },
    });

    if (broadcast) {
      throw new Error(ERROR_CODE.EXISTED_BROADCAST_MESSAGE);
    }

    let sentUsers;
    let responses;
    let tag;
    ({ sentUsers, message, responses, tag } = await getInfoToBroadCastMessage({ message, engineId, shoudAddParam }));

    message.sentMessages = sentUsers && sentUsers.length || 0;

    const broadCastMessage = await createBroadCast({ message, orgId, engineId });
    await processingScheduleTime({ message, responses, engineId, sentUsers, tag });

    return broadCastMessage;
  }

  async updateBroadcastMessageCustomer({ id, data, engineId, orgId }) {
    const isDuplicated = await this.checkDuplicateMessageByName(data.name, engineId, orgId, id);
    if (isDuplicated) throw new Error(ERROR_CODE.EXISTED_BROADCAST_MESSAGE);

    const options = {
      where: {
        _id: id,
        engineId,
      },
      data,
    };

    let { sentUsers, message, responses, tag } = await getInfoToBroadCastMessage({ message: data, engineId });

    if (message) {
      message.sentMessages = sentUsers && sentUsers.length || 0;
    }

    await broadcastMessageRepository.getOneAndUpdate(options);

    return await this.handleMessage({ message, responses, engineId, sentUsers, tag });
  }

  async getSentUsers({ lastActiveDate, channel, pageId, gender, engineId, tags }) {
    let botUsers = await botUserService.getBotUserByEngineId(engineId, channel, lastActiveDate, gender, pageId);
    botUsers = getBotUsersByLastActiveDate(lastActiveDate, botUsers);
    botUsers = getBotUsersByGender(botUsers, gender, channel);

    if (tags && tags.length > 0) {
      botUsers = botUsers.filter(u => {
        if (!u.tags || u.tags.length == 0) return false;

        for (const tag of u.tags) {
          if (!tag._id) continue;
          const t = tags.find(t => t == tag._id.toString());
          if (t) return true;
        }
        return false;
      });
    }

    return botUsers;
  }

  async stopBroadcast({ engineId, name, id }) {
    await this.removeScheduleBroadcast(engineId, name);

    return broadcastMessageRepository.updateOne({
      where: {
        _id: id,
      },
      data: {
        isAsap: true,
      },
    });
  }

  async removeScheduleBroadcast(engineId, name) {
    const key = `${engineId}:${name}`;
    const apiUrl = `${process.env.SCHEDULER_SERVER}/api/v1/schedule?name=${key}`;
    axios.delete(apiUrl, {
      headers: { authorization: process.env.SERVER_API_KEY },
    });
  }

  async handleMessage({ message, responses, engineId, sentUsers, tag }) {
    getUsersQueue.provide({ message, responses, engineId, sentUsers, tag });
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

    const broadcast = await broadcastMessageRepository.getOne({
      where: {
        engineId,
        _id: id,
      },
    });

    if (!broadcast) {
      throw new Error(ERROR.BROADCAST_NOT_FOUND);
    }

    await this.removeScheduleBroadcast(engineId, broadcast.name);

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
      const responsesPromise = broadcastResponseService.getBroadcastResponseByIds(engineId, orgId, message.responses);
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
            if (!tag._id) continue;
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

      const promise = sentUsers.map(u => sendMessage({ u, responses, engineId }));
      await Promise.all(promise);
      const sentMessages = sentUsers.filter(u => u.isSent);
      message.sentMessages = sentMessages && sentMessages.length || 0;
      await this.updateBroadcastMessage(message._id, message, engineId, orgId);
    } catch (error) {
      logger.error(error);
      message.sentMessages = 0;
      await this.updateBroadcastMessage(message._id, message, engineId, orgId);
    }
  }

  async handleBroadcastMessage(message, engineId, orgId) {
    if (!message || !engineId || !orgId) return;

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
          await this.updateBroadcastMessage(message._id, message, engineId, orgId);
          return;
        };

        const now = new Date().getTime();
        const scheduledTime = new Date(new Date(message.scheduleTime).setSeconds(0));
        if (!scheduledTime || isNaN(now)) {
          message.sentMessages = 0;
          await this.updateBroadcastMessage(message._id, message, engineId, orgId);
          return;
        }

        const time = parseInt((scheduledTime.getTime() - now) / 1000);
        if (time <= 0) {
          await this.sendBroadcastMessage(message, engineId, orgId);
          return;
        }

        const key = `${REDIS.PREFIX.BROADCAST_MESSAGE}${engineId}_${orgId}_${message._id}`;
        const url = `${process.env.LIVE_CHAT_SERVER}/v1/timer`;
        scheduleService.createJob(url, 'POST', { key, }, scheduledTime, key);
      } catch (error) {
        logger.error(error);
      }
    }
  }
}

module.exports = new BroadcastMessageService();

async function sendMessage({ u, responses, engineId, messageType }) {
  let sessionInfo;
  if (u.sessionId) {
    const parameterString = await getFromRedis(u.sessionId);
    if (parameterString) sessionInfo = JSON.stringify(parameterString);
  };
  const redisInfo = {
    userInfo: sessionInfo && sessionInfo.userInfo || { name: u.name, phoneNumber: u.phoneNumber },
    queryResult: sessionInfo && sessionInfo.queryResult,
  }
  const allParameters = sessionInfo && sessionInfo.allParameters
  const replacedResponses = responses.map(r => {
    if (r.text && r.text.length > 0) r.text = broadcastResponseService.getRandomResponseText(r.text, allParameters, redisInfo);
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
      ],
      messageType,
    },
    roomId: room._id,
    engineId,
    isProactiveMessage: true,
  });
}

async function createBroadCast({ message, orgId, engineId }) {
  message.orgId = orgId;
  message.engineId = engineId;
  return broadcastMessageRepository.create(message);
}

async function getInfoToBroadCastMessage({ message, engineId, shoudAddParam }) {
  const botUsersPromise = botUserService.getBotUserByEngineId(engineId, message.channel, message.lastActiveDate, message.gender, message.pageId, shoudAddParam);
  const responsesPromise = broadcastResponseService.getResponseFromVaByNames(engineId, message.responses, message);
  const botPromise = botService.getBotByEngineId(engineId);
  let [botUsers, dataResponse, bot] = await Promise.all([botUsersPromise, responsesPromise, botPromise]);

  if ((!botUsers || botUsers.length == 0) && message.channel === CHANNEL.ZALO) {
    return {
      sentUsers: [],
      message: '',
      responses: [],
      tag: '',
    };
  }

  if (!botUsers || botUsers.length == 0) {
    throw new Error(ERROR_CODE.USER_NOT_FOUND_BY_CHANNEL);
  }

  botUsers = getBotUsersByLastActiveDate(message.lastActiveDate, botUsers);
  if (botUsers.length === 0) {
    throw new Error(ERROR_CODE.USER_NOT_FOUND_BY_LAST_ACTIVE_DATE);
  }

  botUsers = getBotUsersByGender(botUsers, message.gender, message.channel);
  if (botUsers.length === 0) {
    throw new Error(ERROR_CODE.USER_NOT_FOUND_BY_GENDER);
  }

  const { responses, ids } = dataResponse;
  message.responses = ids;

  const tag = _.get(message, 'tag');
  let botChannel = _.get(bot, `channels.${message.channel}`);
  if (message.channel === CHANNEL.FB) {
    if (!tag) {
      throw new Error(ERROR_CODE.TAG_IS_REQUIRED);
    }

    if (!botChannel.isActive) {
      botChannel = _.get(bot, `channels.${CHANNEL.Messenger}`);
    }
  }

  if (!botChannel || !botChannel.isActive) {
    throw new Error(ERROR_CODE.CHANNEL_NOT_ACTIVE);
  }

  if (!responses || responses.length == 0) {
    throw new Error(ERROR_CODE.RESPONSE_NOT_FOUND);
  };

  const sentUsers = findUsers(botUsers, message);

  return { sentUsers, message, responses, tag };
}

function findUsers(sentUsers, message) {
  if (
    message.channel === CHANNEL.FB
    || message.channel === CHANNEL.ZALO
  ) {
    sentUsers = sentUsers.filter(u => {
      const pageId = _.get(u, 'channel.pageId');
      if (pageId != message.pageId) return false;
      return true;
    });
  }

  if (sentUsers.length === 0) {
    throw new Error(ERROR_CODE.PAGE_ID_NOT_FOUND);
  }

  if (message.userId) {
    sentUsers = sentUsers.filter(u => {
      const userId = _.get(u, 'channel.userId');
      if (userId != message.userId) return false;
      return true;
    });
  }

  if (!sentUsers || sentUsers.length == 0) {
    throw new Error(ERROR_CODE.USER_NOT_FOUND_BY_PAGE_ID);
  };

  if (message.tags && message.tags.length > 0) {
    sentUsers = sentUsers.filter(u => {
      if (!u.tags || u.tags.length == 0) return false;

      for (const tag of u.tags) {
        if (!tag._id) continue;
        const t = message.tags.find(t => t == tag._id.toString());
        if (t) return true;
      }
      return false;
    });
  }

  if (!sentUsers || sentUsers.length == 0) {
    throw new Error(ERROR_CODE.USER_NOT_FOUND_BY_TAG);
  };

  return sentUsers;
}

function getBotUsersByLastActiveDate(lastActiveDate, botUsers) {
  if (!lastActiveDate) return botUsers;

  return botUsers.filter(user => {
    return new Date(user.lastActiveTime) <= new Date(lastActiveDate);
  });
}

function getBotUsersByGender(botUsers, gender, channel) {
  if (!gender || channel === CHANNEL.ZALO) return botUsers;

  return botUsers.filter(user => {
    return (user.gender === gender);
  });
}
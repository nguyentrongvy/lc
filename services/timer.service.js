const _ = require('lodash');
const axios = require('axios');
const logger = require('./logger');

const messageService = require('./message.service');
const Constants = require('../common/constants');
const { getFromRedis } = require('./redis.service');

const prefix = Constants.REDIS.PREFIX.ROOM;
const prefixMessage = Constants.REDIS.PREFIX.PROACTIVE_MESSAGE;
const roomService = require('./room.service');
const broadcastMessageService = require('./broadcast-message.service');

exports.run = async (key) => {
    const [prefix] = key.split('_');
    const isRoom = isPrefixTypeOfKey(key, prefix);
    const isMessage = isPrefixTypeOfKey(key, prefixMessage);
    switch (`${prefix}_`) {
        case Constants.REDIS.PREFIX.ROOM:
            try {
                const [, roomId, botUserId, engineId] = key.split('_');
                if (!roomId || !engineId) {
                    return;
                }

                const isStoppedBot = await messageService.checkBotHasStop(botUserId, engineId);
                if (isStoppedBot) {
                    return;
                }

                const suggestions = await messageService.getSuggestionRedis(roomId, engineId);
                if (typeof suggestions === 'object' && 'responses' in suggestions) {
                    await messageService.sendMessageAuto({ suggestions, roomId, engineId });
                }
                break;
            } catch (error) {
                logger.error(error);
                break;
            }

        case Constants.REDIS.PREFIX.PROACTIVE_MESSAGE:
            try {
                let [, botUserId, engineId, pageId, proactiveMessageId] = key.split('_');

                if (pageId == 'undefined') pageId = undefined;

                if (!engineId || !proactiveMessageId) {
                    return;
                }
                const room = await roomService.getRoomByUserId(engineId, botUserId);
                if (!room) return;

                await handleUserNoResponse(botUserId, room._id, engineId, pageId, proactiveMessageId, true);
                break;
            } catch (error) {
                logger.error(error);
                break;
            }

        case Constants.REDIS.PREFIX.BROADCAST_MESSAGE:
            try {
                const [, engineId, orgId, broadcastMessageId] = key.split('_');
                const message = await broadcastMessageService.getById(broadcastMessageId, engineId, orgId)
                if (!message) return;

                await broadcastMessageService.sendBroadcastMessage(message, engineId, orgId);
                break;
            } catch (error) {
                logger.error(error);
                break;
            }
        default:
            break;
    }
    if (isRoom) {

    }

    if (isMessage) {

    }
};


function isPrefixTypeOfKey(key, prefix) {
    return key.startsWith(prefix);
}

async function handleUserNoResponse(botUserId, roomId, engineId, pageId, messageId, isProactiveMessage) {
    const key = `${Constants.REDIS.PREFIX.DATA_BOT_USER}${botUserId}`;
    const dataBotUserString = await getFromRedis(key);
    if (!dataBotUserString) return;
    const dataBotUser = JSON.parse(dataBotUserString);
    const proactiveMessages = dataBotUser.proactiveMessages;
    if (!proactiveMessages || proactiveMessages.length == 0) return;

    const message = proactiveMessages.find(m => m._id == messageId);
    if (!message || !message.responses || message.responses.length == 0) return;

    const isActiveMessage = await isActiveProactiveMessage(message._id, engineId);
    if (!isActiveMessage) return;

    await messageService.sendMessageAuto({
        suggestions: {
            pageId,
            responses: [
                {
                    channelResponses: message.responses,
                }
            ]
        }, roomId, engineId,
        isProactiveMessage,
    });
}

async function isActiveProactiveMessage(messageId, engineId) {
    try {
        if (!messageId) return false;

        const url = `${process.env.AUTH_SERVER}/v1/proactive-messages/${messageId}`;
        const rs = await axios.get(url, {
            headers: {
                authorization: process.env.SERVER_API_KEY,
                engineid: engineId,
            }
        });
        const message = _.get(rs, 'data.data');
        if (!message) return false;

        return message.isActive;
    } catch (error) {
        logger.error(error);
        return false;
    }
}

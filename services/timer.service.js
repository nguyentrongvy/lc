const _ = require('lodash');

const messageService = require('./message.service');
const Constants = require('../common/constants');
const { getFromRedis } = require('./redis.service');

const prefix = Constants.REDIS.PREFIX.ROOM;
const prefixMessage = Constants.REDIS.PREFIX.PROACTIVE_MESSAGE;
const roomService = require('./room.service');

exports.run = async (key) => {
    const isRoom = isPrefixTypeOfKey(key, prefix);
    const isMessage = isPrefixTypeOfKey(key, prefixMessage);
    if (isRoom) {
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
        } catch (error) {
            console.error(error);
        }
    }

    if (isMessage) {
        try {
            const [, botUserId, engineId, pageId, proactiveMesssageId] = key.split('_');
            if (!engineId || !pageId || !proactiveMesssageId) {
                return;
            }
            const room = await roomService.getRoomByUserId(engineId, botUserId);
            if (!room) return;

            await handleUserNoResponse(botUserId, room._id, engineId, pageId, proactiveMesssageId, true);
        } catch (error) {
            console.error(error);
        }
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

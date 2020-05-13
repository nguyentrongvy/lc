const _ = require('lodash');

const messageService = require('./message.service');
const Constants = require('../common/constants');

const prefix = Constants.REDIS.PREFIX.ROOM;

exports.run = async (key) => {
    const isRoom = checkPatternRoom(key);
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
};

function checkPatternRoom(key) {
    return key.startsWith(prefix);
}

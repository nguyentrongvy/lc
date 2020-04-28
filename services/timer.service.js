const _ = require('lodash');

const messageService = require('./message.service');
const Constants = require('../common/constants');

const prefix = Constants.REDIS.PREFIX.ROOM;

exports.run = async (key) => {
    const isRoom = checkPatternRoom(key);
    if (isRoom) {
        try {
            const [_$, roomId, botUserId, nlpEngine] = key.split('_');
            if (!roomId || !nlpEngine) {
                return;
            }

            const isStoppedBot = await messageService.checkBotHasStop(botUserId, nlpEngine);
            if (isStoppedBot) {
                return;
            }

            const suggestions = await messageService.getSuggestionRedis(roomId, nlpEngine);
            if (typeof suggestions === 'object' && 'responses' in suggestions) {
                await messageService.sendMessageAuto({ suggestions, roomId, nlpEngine });
            }
        } catch (error) {
            console.error(error);
        }
    }
};

function checkPatternRoom(key) {
    return key.startsWith(prefix);
}

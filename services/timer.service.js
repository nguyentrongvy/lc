const _ = require('lodash');

const messageService = require('./message.service');
const Constants = require('../common/constants');
const { sendBotMessage } = require('./socket-emitter.service');

const prefix = Constants.REDIS.PREFIX.ROOM;

exports.run = async (key) => {
    const isRoom = checkPatternRoom(key);
    if (isRoom) {
        try {
            const [_$, roomId, nlpEngine] = key.split('_');
            if (!roomId || !nlpEngine) {
                return;
            }
            const suggestions = await messageService.getSuggestionRedis(roomId, nlpEngine);
            if (typeof suggestions === 'object') {
                const content = _.get(suggestions, 'responses[0].channelResponses', []);
                const { room, message } = await messageService.sendBotMessage({
                    roomId,
                    nlpEngine,
                    content,
                });
                const dataEmit = {
                    type: Constants.EVENT_TYPE.LAST_MESSAGE_AGENT,
                    payload: {
                        message,
                        room,
                    },
                };
                await messageService.sendToBot({
                    room,
                    responses: content,
                });
                const agentId = _.get(room, 'agents[0]._id');
                sendBotMessage(agentId, dataEmit);
            }
        } catch (error) {
            console.error(error);
        }
    }
};

function checkPatternRoom(key) {
    return key.startsWith(prefix);
}

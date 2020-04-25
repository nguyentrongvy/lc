const _ = require('lodash');
const axios = require('axios');
const { delFromRedis, setExToRedis } = require('../services/redis.service');
const Constants = require('../common/constants');
const messageService = require('../services/message.service');

exports.initEvent = (socket) => {
    socket.on(Constants.EVENT.CHAT, async (data = {}, callback) => {
        try {
            const type = data.type;
            switch (type) {
                case Constants.EVENT_TYPE.SEND_MESSAGE: {
                    const {
                        roomId,
                        intents,
                        entities,
                        responses,
                    } = data.payload;
                    const agentId = socket.user._id;
                    const nlpEngine = socket.nlpEngine._id;
                    const { message, room } = await messageService.sendAgentMessage({
                        roomId,
                        agentId,
                        nlpEngine,
                        content: responses,
                    });
                    const botUserId = _.get(room, 'botUser._id', '').toString();
                    await removeTimer(roomId, botUserId, nlpEngine);
                    const dataEmit = {
                        type: Constants.EVENT_TYPE.LAST_MESSAGE_AGENT,
                        payload: {
                            message,
                            room,
                        },
                    };
                    socket.broadcast.to(agentId).emit(
                        Constants.EVENT.CHAT,
                        dataEmit,
                    );
                    await messageService.sendToBot({
                        room,
                        intents,
                        entities,
                        responses,
                    });
                    return callback(null, message);
                }
                default: {
                    return callback();
                }
            }
        } catch (error) {
            console.error(error);
            callback(error);
        }
    });
};

function removeTimer(roomId, botUserId, nlpEngine) {
    const key = `${Constants.REDIS.PREFIX.ROOM}${roomId}_${botUserId}_${nlpEngine}`;
    return delFromRedis(key);
}

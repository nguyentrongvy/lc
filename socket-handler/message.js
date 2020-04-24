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
                    const { content, roomId } = data.payload;
                    const agentId = socket.user._id;
                    const nlpEngine = socket.nlpEngine._id;
                    await increaseTimer(roomId, nlpEngine);
                    const { message, room } = await messageService.sendAgentMessage({
                        content,
                        roomId,
                        agentId,
                        nlpEngine,
                    });
                    await removeTimer(roomId, nlpEngine);
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
                        responses: message.content,
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

function removeTimer(roomId, nlpEngine) {
    const key = `${Constants.REDIS.PREFIX.ROOM}${roomId}_${nlpEngine}`;
    return delFromRedis(key);
}

function increaseTimer(roomId, nlpEngine) {
    const key = `${Constants.REDIS.PREFIX.ROOM}${roomId}_${nlpEngine}`;
    return setExToRedis(
        key,
        parseInt(Constants.REDIS.ROOM.EXPIRE_TIME / 1000),
        true
    );
}

const _ = require('lodash');
const Constants = require('../common/constants');
const messageService = require('../services/message.service');

exports.initEvent = (socket, io) => {
    socket.on(Constants.EVENT.CHAT, async (data = {}, callback) => {
        try {
            const type = data.type;
            switch (type) {
                case Constants.EVENT_TYPE.SEND_MESSAGE: {
                    const { content, roomId } = data.payload;
                    const agentId = socket.user._id;
                    const nlpEngine = socket.nlpEngine._id;
                    const { message, room } = await messageService.sendAgentMessage({
                        content,
                        roomId,
                        agentId,
                        nlpEngine,
                    });
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

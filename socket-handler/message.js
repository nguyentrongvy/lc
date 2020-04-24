const _ = require('lodash');
const axios = require('axios');

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
                    await sendToBot({ room, message });
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

function sendToBot({
    message,
    room,
}) {
    const userId = _.get(room, 'botUser._id', '').toString();
    const channel = room.channel;
    // TODO: change format message
    const responses = [message.content];
    const url = `${process.env.NLP_SERVER}/api/v1/agents/messages`;
    return axios.post(url, {
        text: 'Hello',
        userId,
        channel,
        intents: [],
        oldIntents: [],
        entities: {},
        oldEntities: {},
        responses,
    }, {
        headers: {
            authorization: process.env.SERVER_API_KEY,
        },
    });
}

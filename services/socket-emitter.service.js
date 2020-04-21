const _ = require('lodash');

const socketEmitter = require('socket.io-emitter')(process.env.REDIS_HOST);
const Constants = require('../common/constants');

exports.sendMessage = ({
    room,
    message,
    intents,
    entities,
    responses,
    nlpEngine,
}) => {
    const agentId = _.get(room, 'agents[0]');
    if (!agentId) {
        socketEmitter.to(nlpEngine).emit(
            Constants.EVENT.CHAT,
            {
                type: Constants.EVENT_TYPE.SEND_USER_MESSAGE,
                payload: {
                    room,
                    message,
                    intents,
                    entities,
                    responses,
                },
            },
        );
    } else {
        socketEmitter.to(agentId).emit(
            Constants.EVENT.CHAT,
            {
                type: Constants.EVENT_TYPE.SEND_USER_MESSAGE,
                payload: {
                    room,
                    message,
                    intents,
                    entities,
                    responses,
                },
            },
        );
    }
    // socketEmitter.to(userId).emit('chat', {
    //     type: 'bot-message',
    //     responses,
    // });
};

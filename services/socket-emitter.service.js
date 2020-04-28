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
    const agentId = _.get(room, 'agents[0]', '').toString();
    const payload = {
        room,
        message,
        intents,
        entities,
        responses,
    };
    if (!agentId) {
        socketEmitter.to(nlpEngine).emit(
            Constants.EVENT.CHAT,
            {
                payload,
                type: Constants.EVENT_TYPE.SEND_UNASSIGNED_CHAT,
            },
        );
    } else {
        socketEmitter.to(agentId.toString()).emit(
            Constants.EVENT.CHAT,
            {
                payload,
                type: Constants.EVENT_TYPE.SEND_USER_MESSAGE,
            },
        );
    }
};

exports.sendBotMessage = (agentId, dataEmit) => {
    if (!agentId) {
        return;
    }
    socketEmitter.to(agentId.toString()).emit(Constants.EVENT.CHAT, dataEmit);
};

exports.sendClearTimer = (roomId, nlpEngine) => {
    const dataEmit = {
        type: Constants.EVENT_TYPE.CLEAR_TIMER,
        payload: { roomId },
    };
    socketEmitter.to(nlpEngine.toString()).emit(
        Constants.EVENT.CHAT,
        dataEmit,
    );
};

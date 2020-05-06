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
    isNew,
}) => {
    const agentId = _.get(room, 'agents[0]', '').toString();
    const payload = {
        room,
        message,
        intents,
        entities,
        responses,
        isNew,
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

exports.sendBotMessage = (receiver, dataEmit) => {
    if (!receiver) {
        return;
    }
    socketEmitter.to(receiver.toString()).emit(Constants.EVENT.CHAT, dataEmit);
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

exports.sendNotification = (nlpEngine, notification) => {
    const dataEmit = {
        type: Constants.EVENT_TYPE.SEND_NOTIFICATION,
        payload: { notification },
    };
    socketEmitter.to(nlpEngine.toString()).emit(
        Constants.EVENT.NOTIFICATION,
        dataEmit,
    );
};

exports.sendJoinRoom = (nlpEngine, room) => {
    const dataEmit = {
        type: Constants.EVENT_TYPE.JOIN_ROOM,
        payload: { room },
    };
    socketEmitter.to(nlpEngine.toString()).emit(
        Constants.EVENT.CHAT,
        dataEmit,
    );
};

exports.sendLeftRoom = nlpEngine => {
    const dataEmit = {
        type: Constants.EVENT_TYPE.LEFT_ROOM,
        payload: {},
    };
    socketEmitter.to(nlpEngine.toString()).emit(
        Constants.EVENT.CHAT,
        dataEmit,
    );
};

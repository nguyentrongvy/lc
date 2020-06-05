const _ = require('lodash');

const socketEmitter = require('socket.io-emitter')(process.env.REDIS_HOST);
const Constants = require('../common/constants');

exports.sendMessage = ({
    room,
    message,
    intents,
    entities,
    responses,
    engineId,
    isNew,
    faqResponses,
}) => {
    const agentId = _.get(room, 'agents[0]', '').toString();
    const payload = {
        room,
        message,
        intents,
        entities,
        responses,
        isNew,
        faqResponses,
    };
    const dataEmit = {
        payload,
    };

    if (!agentId) {
        dataEmit.type = Constants.EVENT_TYPE.SEND_UNASSIGNED_CHAT;
    } else {
        dataEmit.type = Constants.EVENT_TYPE.SEND_USER_MESSAGE;
    }
    socketEmitter.to(engineId).emit(
        Constants.EVENT.CHAT,
        dataEmit,
    );
};

exports.sendBotMessage = (receiver, dataEmit) => {
    if (!receiver) {
        return;
    }
    socketEmitter.to(receiver.toString()).emit(Constants.EVENT.CHAT, dataEmit);
};

exports.sendClearTimer = (roomId, engineId) => {
    const dataEmit = {
        type: Constants.EVENT_TYPE.CLEAR_TIMER,
        payload: { roomId },
    };
    socketEmitter.to(engineId.toString()).emit(
        Constants.EVENT.CHAT,
        dataEmit,
    );
};

exports.sendNotification = (engineId, notification) => {
    const dataEmit = {
        type: Constants.EVENT_TYPE.SEND_NOTIFICATION,
        payload: { notification },
    };
    socketEmitter.to(engineId.toString()).emit(
        Constants.EVENT.NOTIFICATION,
        dataEmit,
    );
};

exports.sendJoinRoom = (engineId, room, message) => {
    const dataEmit = {
        type: Constants.EVENT_TYPE.JOIN_ROOM,
        payload: { room, message },
    };
    socketEmitter.to(engineId.toString()).emit(
        Constants.EVENT.CHAT,
        dataEmit,
    );
};

exports.sendLeftRoom = engineId => {
    const dataEmit = {
        type: Constants.EVENT_TYPE.LEFT_ROOM,
        payload: {},
    };
    socketEmitter.to(engineId.toString()).emit(
        Constants.EVENT.CHAT,
        dataEmit,
    );
};

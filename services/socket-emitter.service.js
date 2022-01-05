const _ = require('lodash');
const { REDIS_OPTIONS } = require('../common/redis-options');
const socketEmitter = require('socket.io-emitter')(REDIS_OPTIONS);
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

exports.sendUserInfo = (receiver, dataEmit) => {
    if (!receiver) {
        return;
    }
    socketEmitter.to(receiver.toString()).emit(Constants.EVENT.DATA_PROCESSING, dataEmit);
}

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

exports.sendLeftRoom = ({ room, lastMessage, engineId, isAfk = false }) => {
    const dataEmit = {
        type: Constants.EVENT_TYPE.LEFT_ROOM,
        payload: {
            isAfk: isAfk,
            room,
            message: lastMessage,
        },
    };
    socketEmitter.to(engineId.toString()).emit(
        Constants.EVENT.CHAT,
        dataEmit,
    );
};

exports.sendMaintenance = (maintenanceInfo, engineId) => {
    if (!maintenanceInfo) {
        const payload = '';
        const dataEmit = {
            payload,
        }
        return socketEmitter.to(engineId).emit(
            Constants.EVENT.Maintenance,
            dataEmit,
        )
    }

    const payload = {
        status: maintenanceInfo.isActive,
        start: maintenanceInfo.start,
        end: maintenanceInfo.end,
        message: maintenanceInfo.message,
        isMaintenance: maintenanceInfo.isMaintenance || undefined,
    }

    const dataEmit = {
        payload,
    };

    socketEmitter.to(engineId).emit(
        Constants.EVENT.Maintenance,
        dataEmit,
    );
}

exports.sendAgentSeenMessage = ({ message }) => {
    const dataEmit = {
        type: Constants.EVENT_TYPE.SEEN_MESSAGE,
        payload: {
            message,
        },
    };
    const engineId = message && message.engineId;
    socketEmitter.to(engineId.toString()).emit(
        Constants.EVENT.CHAT,
        dataEmit,
    );
};

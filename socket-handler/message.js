const _ = require('lodash');

const Constants = require('../common/constants');
const messageService = require('../services/message.service');
const roomService = require('../services/room.service');

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
                    const engineId = socket.engine._id;
                    const orgId = socket.org._id;

                    const isMaintenance = await messageService.verifyMaintenance(engineId);
                    if (isMaintenance) return callback(new Error('System is under maintenance'));

                    await messageService.removeTimer(roomId, '*', engineId);
                    const { message, room } = await messageService.sendAgentMessage({
                        roomId,
                        agentId,
                        engineId,
                        content: responses,
                    });
                    if (!message) {
                        return callback(new Error('Message is invalid'));
                    }
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

                    const {
                        masterBot,
                        dataEmit: dataEmitToMaster,
                    } = await messageService.emitResponseToMaster({
                        roomId,
                        orgId,
                        engineId,
                        agentId,
                        content: responses,
                        botUser: _.get(room, 'botUser._id'),
                    });

                    if (masterBot) {
                        socket.broadcast.to(masterBot).emit(
                            Constants.EVENT.CHAT,
                            dataEmitToMaster,
                        );
                    }

                    await messageService.sendToBot({
                        room,
                        intents,
                        entities,
                        responses,
                        pageId: room.pageId,
                    });
                    return callback(null, message);
                }
                case Constants.EVENT_TYPE.FOCUS_INPUT: {
                    const { roomId } = data.payload;
                    const unreadMessages = 0;
                    const room = await roomService.updateUnreadMessages({ roomId, unreadMessages });

                    return callback(null, room);
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

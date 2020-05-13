const _ = require('lodash');

const {
    notificationRepository,
    roomRepository,
} = require('../repositories');
const Constants = require('../common/constants');
const { sendNotification } = require('./socket-emitter.service');
const roomService = require('./room.service');

class NotificationService {
    getListNotification({ engineId, lastNotification }) {
        const condition = {
            engineId,
        };
        if (lastNotification) {
            condition._id = {
                $lt: lastNotification,
            };
        }

        return notificationRepository.getMany({
            where: condition,
            fields: 'content type createdAt room isHandled',
            sort: '-createdAt',
            limit: Constants.NOTIFICATION.LIMIT,
        });
    }

    async createNotification({ type, content, botUser, engineId, channel }) {
        let room = await roomRepository.getOne({
            where: {
                'botUser._id': botUser._id,
                engineId,
            },
            fields: '_id agents',
        });

        if (!room) {
            room = await roomRepository.create({
                channel,
                engineId,
                botUser: {
                    _id: botUser._id,
                    username: botUser.name || Constants.CHAT_CONSTANTS.DEFAULT_NAME,
                },
            });
        }

        const dataNotification = {
            type,
            content,
            engineId,
            room: room._id,
        };

        let receiver;

        // if (room && type === Constants.NOTIFICATION.TYPES.JOIN_ROOM) {
        //     const agent = _.get(room, 'agents[0]', '').toString();
        //     dataNotification.isHandled = true;
        //     receiver = agent;
        // } else {
        receiver = engineId;
        // }

        const notification = await notificationRepository.create(dataNotification);
        sendNotification(receiver, notification.toObject());

        return notification;
    }

    async handleNotification({ agentId, notiId, engineId }) {
        const notification = await notificationRepository.getOne({
            where: {
                engineId,
                _id: notiId,
                isHandled: false,
            },
            isLean: false,
        });

        if (!notification) {
            return;
        }

        const type = notification.type;
        if (type === Constants.NOTIFICATION.TYPES.JOIN_ROOM) {
            const roomID = notification.room;
            await roomService.joinRoom({
                roomID,
                engineId,
                agentID: agentId,
            }).catch(err => {
                if (err.message === Constants.ERROR.ROOM_NOT_FOUND) {
                    return;
                }
                console.error(err);
            });
        }

        notification.isHandled = true;
        await notification.save();
        sendNotification(engineId, notification.toObject());
        return notification.toObject();
    }

    countNotification(engineId) {
        return notificationRepository.count({
            engineId,
            isHandled: false,
        });
    }
}

module.exports = new NotificationService();

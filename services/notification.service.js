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

    async createNotification({ type, content, botUser, engineId }) {

        const dataNotification = {
            type,
            content,
            engineId,
            botUser: botUser._id,
        };

        const receiver = engineId;

        const notification = await notificationRepository.create(dataNotification);
        sendNotification(receiver, notification.toObject());

        return notification;
    }

    async handleNotification({ agentId, notificationId, engineId }) {
        const notification = await notificationRepository.getOne({
            where: {
                engineId,
                _id: notificationId,
                isHandled: false,
            },
            isLean: false,
        });

        if (!notification) {
            return;
        }


        let additionalData;
        const type = notification.type;
        if (type === Constants.NOTIFICATION.TYPES.JOIN_ROOM) {
            const botUserId = notification.botUser;
            const message = await roomService.joinRoom({
                botUserId,
                engineId,
                agentID: agentId,
            }).catch(err => {
                if (err.message === Constants.ERROR.ROOM_NOT_FOUND) {
                    return;
                }
                console.error(err);
            });

            if (message) {
                additionalData = message.room;
            }
        }

        notification.isHandled = true;
        await notification.save();
        sendNotification(engineId, notification.toObject());
        return {
            ... notification.toObject(),
            room: additionalData,
        };
    }

    countNotification(engineId) {
        return notificationRepository.count({
            engineId,
            isHandled: false,
        });
    }
}

module.exports = new NotificationService();

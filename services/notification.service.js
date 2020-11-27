const _ = require('lodash');

const {
    notificationRepository,
    roomRepository,
} = require('../repositories');
const Constants = require('../common/constants');
const { sendNotification } = require('./socket-emitter.service');
const roomService = require('./room.service');
const logger = require('../services/logger');

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
            fields: 'content type createdAt botUser isHandled',
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
            },
            isLean: false,
        });

        if (!notification) {
            return;
        }

        let additionalData;
        const type = notification.type;
        if (type === Constants.NOTIFICATION.TYPES.JOIN_ROOM && !notification.isHandled) {
            const botUserId = notification.botUser;
            const message = await roomService.joinRoom({
                botUserId,
                engineId,
                agentID: agentId,
            }).catch(err => {
                if (err.message === Constants.ERROR.ROOM_NOT_FOUND) {
                    return;
                }
                logger.error(err);
            });

            if (message) {
                additionalData = message.room;
            }
        }

        if (!additionalData) {
            const room = await roomRepository.getOne({
                where: {
                    engineId,
                    'botUser._id': notification.botUser,
                },
                fields: '_id',
            });

            additionalData = _.get(room, '_id');
        }

        notification.isHandled = true;
        await notification.save();
        sendNotification(engineId, notification.toObject());
        return {
            ...notification.toObject(),
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

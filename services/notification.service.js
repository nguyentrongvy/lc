const _ = require('lodash');

const {
    notificationRepository,
    roomRepository,
} = require('../repositories');
const Constants = require('../common/constants');
const { sendNotification } = require('./socket-emitter.service');
const roomService = require('./room.service');

class NotificationService {
    getListNotification({ nlpEngine, lastNotification }) {
        const condition = {
            nlpEngine,
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

    async createNotification({ type, content, botUser, nlpEngine }) {
        const room = await roomRepository.getOne({
            where: {
                'botUser._id': botUser,
                nlpEngine,
            },
            fields: '_id agents',
        });

        const dataNotification = {
            type,
            content,
            nlpEngine,
            room: room._id,
        };

        let receiver;

        // if (room && type === Constants.NOTIFICATION.TYPES.JOIN_ROOM) {
        //     const agent = _.get(room, 'agents[0]', '').toString();
        //     dataNotification.isHandled = true;
        //     receiver = agent;
        // } else {
        receiver = nlpEngine;
        // }

        const notification = await notificationRepository.create(dataNotification);
        sendNotification(receiver, notification.toObject());

        return notification;
    }

    async handleNotification({ agentId, notiId, nlpEngine }) {
        const notification = await notificationRepository.getOne({
            where: {
                nlpEngine,
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
                nlpEngine,
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
        sendNotification(nlpEngine, notification.toObject());
        return notification.toObject();
    }

    countNotification(nlpEngine) {
        return notificationRepository.count({
            nlpEngine,
            isHandled: false,
        });
    }
}

module.exports = new NotificationService();

const { ResponseSuccess } = require('../helpers/response.helper');
const notificationService = require('../services/notification.service');
const Constants = require('../common/constants');

class NotificationControlelr {
    async getListNotification(req, res, next) {
        try {
            const { lastNotification } = req.query;
            const nlpEngine = req.nlpEngine._id;
            const notifications = await notificationService.getListNotification({
                lastNotification,
                nlpEngine,
            });
            return ResponseSuccess(Constants.SUCCESS.GET_NOTIFICATIONS, notifications, res);
        } catch (error) {
            next(error);
        }
    }

    async createNotification(req, res, next) {
        try {
            const {
                type,
                content,
                botUser,
                channel,
            } = req.body;
            const nlpEngine = req.nlpEngine._id;
            await notificationService.createNotification({
                type,
                content,
                botUser,
                nlpEngine,
                channel,
            });

            return ResponseSuccess(Constants.SUCCESS.CREATE_NOTIFICATION, null, res);
        } catch (error) {
            next(error);
        }
    }

    async handleNotification(req, res, next) {
        try {
            const { id: notiId } = req.params;
            const agentId = req.user._id;
            const nlpEngine = req.nlpEngine._id;
            const notification = await notificationService.handleNotification({
                notiId,
                agentId,
                nlpEngine,
            });
            return ResponseSuccess(Constants.SUCCESS.HANDLE_NOTIFICATION, notification, res);
        } catch (error) {
            next(error);
        }
    }

    async countNotification(req, res, next) {
        try {
            const nlpEngine = req.nlpEngine._id;
            const count = await notificationService.countNotification(nlpEngine);
            return ResponseSuccess(Constants.SUCCESS.COUNT_NOTIFICATION, count, res);
        } catch(error) {
            next(error);
        }
    }
}

module.exports = new NotificationControlelr();
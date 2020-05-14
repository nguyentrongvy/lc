const { ResponseSuccess } = require('../helpers/response.helper');
const notificationService = require('../services/notification.service');
const Constants = require('../common/constants');

class NotificationController {
    async getListNotification(req, res, next) {
        try {
            const { lastNotification } = req.query;
            const engineId = req.engine._id;
            const notifications = await notificationService.getListNotification({
                lastNotification,
                engineId,
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
            const engineId = req.engine._id;
            await notificationService.createNotification({
                type,
                content,
                botUser,
                engineId,
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
            const engineId = req.engine._id;
            const notification = await notificationService.handleNotification({
                notiId,
                agentId,
                engineId,
            });
            return ResponseSuccess(Constants.SUCCESS.HANDLE_NOTIFICATION, notification, res);
        } catch (error) {
            next(error);
        }
    }

    async countNotification(req, res, next) {
        try {
            const engineId = req.engine._id;
            const count = await notificationService.countNotification(engineId);
            return ResponseSuccess(Constants.SUCCESS.COUNT_NOTIFICATION, count, res);
        } catch(error) {
            next(error);
        }
    }
}

module.exports = new NotificationController();
const messageService = require('../services/message.service');
const { ResponseSuccess } = require('../helpers/response.helper');
const Constants = require('../common/constants');

class MessageControlelr {
    async sendMessage(req, res, next) {
        try {
            const {
                botUser,
                nlpEngine,
                content,
                channel,
            } = req.body;
            const result = await messageService.sendMessage({
                botUser,
                nlpEngine,
                content,
                channel,
            });
            return ResponseSuccess(Constants.SUCCESS.SEND_MESSAGE, result, res);
        } catch (error) {
            next(error);
        }
    }

    async getMessagesByRoomID(req, res, next) {
        try {
            const { roomID } = req.params;
            let { channel, search, page, length } = req.query;
            const { recordsTotal, messages } = await messageService.getMessagesByRoomID({ channel, search, page, length, roomID });
            return res.json({
                success: true,
                recordsTotal,
                recordsFiltered: recordsTotal,
                data: messages,
            });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new MessageControlelr();
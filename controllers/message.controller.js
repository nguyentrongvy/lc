const messageService = require('../services/message.service');
const { ResponseSuccess } = require('../helpers/response.helper');

class MessageControlelr {
    async sendMessage(req, res, next) {
        try {
            const { botUser, nlpEngine, content, channel } = req.body;
            const result = await messageService.sendMessage(botUser, nlpEngine, content, channel);
            return ResponseSuccess('SEND_MESSAGE_SUCCESS', result, res);
        } catch (error) {
            console.error(error);
        }
    }

    async getMessagesByRoomID(req, res, next) {
        try {
            const roomID = req.params.roomID;
            let { channel, search, page, length } = req.query;
            const { recordsTotal, messages } = await messageService.getMessagesByRoomID({ channel, search, page, length, roomID });
            return res.json({
                success: true,
                recordsTotal,
                recordsFiltered: recordsTotal,
                data: messages,
            });
        } catch (error) {
            console.error(error);
        }
    }
}

module.exports = new MessageControlelr();
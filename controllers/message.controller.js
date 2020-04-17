const messageService = require('../services/message.service');
const { ResponseSuccess } = require('../helpers/response.helper');

class MessageControlelr {
    async sendMessage(req, res, next) {
        try {
            const data = req.body.data;
            const result = await messageService.sendMessage(data);
            return ResponseSuccess('SEND_MESSAGE_SUCCESS', result, res);
        } catch (error) {
            console.error(error);
        }
    }
}

module.exports = new MessageControlelr();
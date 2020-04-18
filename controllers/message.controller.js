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
}

module.exports = new MessageControlelr();
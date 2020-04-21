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
				intents,
				entities,
				responses,
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
			const { id: roomID } = req.params;
			let { channel, search, lastMessage } = req.query;
			const messages = await messageService.getMessagesByRoomID({
				channel,
				search,
				lastMessage,
				roomID,
			});
			return ResponseSuccess(Constants.SUCCESS.GET_LIST_MESSAGE, messages, res);
		} catch (error) {
			next(error);
		}
	}
}

module.exports = new MessageControlelr();
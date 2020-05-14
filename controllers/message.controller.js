const _ = require('lodash');
const messageService = require('../services/message.service');
const { ResponseSuccess } = require('../helpers/response.helper');
const Constants = require('../common/constants');
const logger = require('../services/logger');

class MessageController {
	async sendMessage(req, res, next) {
		try {
			const {
				botUser,
				engineId,
				content,
				channel,
				intents,
				entities,
				responses,
			} = req.body;

			const isOffline = await messageService.checkAgentOffline(engineId);

			const { message, room, isNew } = await messageService.sendMessage({
				botUser,
				engineId,
				content,
				channel,
				isOffline,
			});

			const isUnassignedRoom = !room.agents || room.agents.length === 0;
			if (isOffline || isUnassignedRoom) {
				setImmediate(() => {
					const suggestions = {
						responses,
					};
					messageService.sendMessageAuto({
						suggestions,
						engineId,
						roomId: room._id.toString(),
					}).catch(err => {
						logger.error(err);
					});
				});
			}

			await messageService.emitMessage({
					room,
					message,
					intents,
					entities,
					engineId,
					responses,
					isNew,
			});

			return ResponseSuccess(Constants.SUCCESS.SEND_MESSAGE, message, res);
		} catch (error) {
			next(error);
		}
	}

	async getMessagesByRoomID(req, res, next) {
		try {
			const { id: roomID } = req.params;
			let { channel, search, lastMessage, type } = req.query;
			const messages = await messageService.getMessagesByRoomID({
				channel,
				search,
				lastMessage,
				roomID,
				type,
			});
			return ResponseSuccess(Constants.SUCCESS.GET_LIST_MESSAGE, messages, res);
		} catch (error) {
			next(error);
		}
	}

	async getMessagesByKeyWord(req, res, next) {
		try {
			const { id: roomId } = req.params;
			const { search, lastMessage } = req.query;
			const messages = await messageService.getMessagesByKeyWord({
				search,
				lastMessage,
				roomId,
			});

			return ResponseSuccess(Constants.SUCCESS.GET_LIST_MESSAGE, messages, res);
		} catch (error) {
			next(error);
		}
	}
}

module.exports = new MessageController();

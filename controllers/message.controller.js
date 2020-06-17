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
				content,
				channel,
				intents,
				entities,
				responses,
				masterBot,
				pageId,
				faqResponses,
			} = req.body;

			const orgId = req.org._id;

			const isOffline = await messageService.checkAgentOffline(masterBot);

			const listBot = getListBot(responses, masterBot);

			if (listBot.length > 5) {
				throw new Error('Redirect too many bots');
			}

			const botResponses = responses.reduce((acc, response) => {
				if (!('channelResponses' in response)) {
					return acc;
				}
				const botId = response.botId;
				if (!acc[botId]) {
					acc[botId] = [];
				}

				acc[botId].push(response);
				return acc;
			}, {});

			const dataChat = await messageService.createIncomingMsg({
				botUser,
				listBot,
				content,
				channel,
				orgId,
				pageId,
			});

			await messageService.setTimeoutResponse(listBot, dataChat, botUser._id);

			await messageService.emitMessages({
				intents,
				entities,
				dataChat,
				masterBot,
				pageId,
				faqResponses,
				responses: botResponses,
			});

			const isUnassignedMasterRoom = checkIsUnassignedRoom(dataChat, masterBot);
			if (isOffline || isUnassignedMasterRoom) {
				const bot = getBotNotMaster(masterBot, listBot);
				const isBotOffline = await messageService.checkAgentOffline(bot);
				const isUnassignedRoom = checkIsUnassignedRoom(dataChat, bot);
				if (isBotOffline || isUnassignedRoom || isUnassignedMasterRoom) {
					setImmediate(() => {
						messageService.sendMessagesAuto({
							dataChat,
							listBot,
							masterBot,
							pageId,
							responses: botResponses,
						});
					});
				}
			}

			return ResponseSuccess(Constants.SUCCESS.SEND_MESSAGE, null, res);
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

function getListBot(responses, masterBot) {
	let listBot = responses.map(response => response.botId);
	listBot.push(masterBot);
	return Array.from(new Set(listBot));
}

function getBotNotMaster(masterBot, listBot) {
	return listBot.find(bot => bot !== masterBot);
}

function checkIsUnassignedRoom(dataChat, bot) {
	const data = dataChat.find(data => {
		const { room } = data;
		return room.engineId.toString() === bot;
	});

	if (data) {
		const { room } = data;
		return room && (!room.agents || room.agents.length === 0);
	}

	return true;
}

module.exports = new MessageController();

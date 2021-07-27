const axios = require('axios');
const _ = require('lodash');

const {
	messageRepository,
	roomRepository,
} = require('../repositories');
const Constants = require('../common/constants');
const {
	hmSetToRedis,
	setExToRedis,
	hmGetFromRedis,
	delFromRedis,
	getFromRedis,
	publishStopBot,
} = require('../services/redis.service');
const {
	sendMessage,
	sendClearTimer,
	sendBotMessage,
	sendMaintenance,
	sendAgentSeenMessage,
	sendUserInfo,
} = require('../services/socket-emitter.service');
const dateTimeHelper = require('../helpers/date-time.helper');
const scheduleService = require('./schedule.service');

class MessageService {
	create({ botUser, engineId, room, content, channel, action, agent }) {
		return messageRepository.create({
			botUser: botUser,
			engineId: engineId,
			room,
			agent,
			content: content,
			channel: channel,
			action: (action ? action : Constants.ACTION.CHAT),
		});
	}

	async getMessagesByRoomID({ search, lastMessage, roomID, type }) {
		const condition = {
			room: roomID,
		};
		if (!type || type == 'prev') {
			if (lastMessage) {
				condition._id = {
					$lt: lastMessage,
				};
			}
		}
		if (type == 'next') {
			if (lastMessage) {
				condition._id = {
					$gt: lastMessage,
				};
			}
		}

		const sortCondition = {
			createdAt: -1,
		};
		const messages = await messageRepository.getMany({
			where: condition,
			sort: sortCondition,
			fields: 'botUser agent content createdAt action',
		});

		return messages;
	}

	async getMessagesByKeyWord({ search, lastMessage, roomId }) {
		const condition = {
			room: roomId,
		};
		if (search) {
			condition.content = new RegExp(search, 'gi');
		};
		const sortCondition = {
			createdAt: -1,
		};
		if (lastMessage) {
			const messagesBylastMessage = await getMessagesByLastMessage(lastMessage, roomId);
			return {
				messagesBylastMessage,
				currentId: lastMessage,
			};
		}
		const messages = await messageRepository.getMany({
			where: condition,
			sort: sortCondition,
			fields: 'botUser agent content createdAt',
		});
		if (!messages || messages.length == 0) return;

		lastMessage = (messages && messages[0] && messages[0]._id && messages[0]._id.toString()) || '';

		const messagesBylastMessage = await getMessagesByLastMessage(lastMessage, roomId);

		return {
			messages,
			messagesBylastMessage,
			currentId: lastMessage,
		};
	}

	async sendAgentMessage({ agentId, roomId, content, engineId }) {
		const room = await roomRepository.getOne({
			where: {
				engineId,
				_id: roomId,
				'agents': agentId,
			},
			fields: '_id channel lastMessage botUser unreadMessages engineId pageId',
			isLean: false,
		});

		if (!room) {
			throw new Error(Constants.ERROR.ROOM_NOT_FOUND);
		}

		return createAgentMsgAndUpdateRoom({
			content,
			agentId,
			engineId,
			room,
		});
	}

	async sendBotMessage({ roomId, content, engineId }) {
		if (!content || (Array.isArray(content) && content.length === 0)) {
			return {};
		}
		const room = await roomRepository.getOneAndUpdate({
			where: {
				engineId,
				_id: roomId,
			},
			data: {
				unreadMessages: 0,
			},
			fields: '_id channel lastMessage botUser agents engineId',
			isLean: false,
		});
		if (!room) {
			throw new Error(Constants.ERROR.ROOM_NOT_FOUND);
		}
		const message = await messageRepository.create({
			engineId,
			room: roomId,
			content: JSON.stringify(content),
			channel: room.channel,
		});

		room.lastMessage = message._id;
		await room.save();
		return {
			room: room.toObject(),
			message: message.toObject(),
		};
	}

	async verifyMaintenance(engineId) {
		const maintenanceInfo = await getFromRedis(Constants.REDIS.PREFIX.LiveChatMaintenance);
		if (!maintenanceInfo) return;
		const newMaintenanceInfo = JSON.parse(maintenanceInfo);
		if (newMaintenanceInfo.isActive) {
			const now = new Date();
			if (new Date(newMaintenanceInfo.start) <= now && now <= new Date(newMaintenanceInfo.end)) {
				newMaintenanceInfo.isMaintenance = true;
				await sendMaintenance(newMaintenanceInfo, engineId);
				return true;
			}
			await sendMaintenance(newMaintenanceInfo, engineId);
			return;
		}

		await sendMaintenance('', engineId);
	}

	async emitMessages({
		botUser,
		dataChat,
		intents,
		entities,
		responses,
		masterBot,
		pageId,
		faqResponses,
		allParameters,
		nlpIntentsOriginal,
		messageLogId,
		triggers,
	}) {
		for (const { room } of dataChat) {
			const roomId = room._id;
			const botUser = _.get(room, 'botUser._id', '').toString();
			const engineId = room.engineId.toString();
			const isStopped = room.isStopped;

			if (!isStopped) {
				const suggestions = await this.getSuggestionRedis(roomId, engineId);
				if (
					typeof suggestions === 'object'
					&& 'responses' in suggestions
					&& !!botUser
				) {
					await this.sendMessageAuto({ suggestions, roomId, engineId });
				}
			}
		}

		for (let index = 0; index < dataChat.length; index++) {
			const { room, message } = dataChat[index];
			const isNew = room.isNew;
			const engineId = room.engineId.toString();
			const dataSending = {
				room,
				message,
				engineId,
				isNew,
				responses: responses[engineId],
			};
			if (index === 0) {
				dataSending.intents = intents;
				dataSending.entities = entities;
				dataSending.faqResponses = faqResponses;
			}
			if (!_.isEmpty(triggers)) {
				await this.sendUserInfoToLiveChat({ triggers, engineId, botUser });
			}

			sendMessage(dataSending);

			if (intents && intents.length > 0) {
				const dataStore = {
					masterBot,
					pageId,
					faqResponses,
					responses: responses[engineId],
					text: _.get(message, 'content'),
					allParameters,
					nlpIntentsOriginal,
					messageLogId,
				};
				if (index === 0) {
					dataStore.intents = intents;
					dataStore.entities = entities;
				}
				await hmSetToRedis(engineId, room._id.toString(), JSON.stringify(dataStore));
			}
		}
	}

	async sendToBot({
		room,
		intents,
		entities,
		responses,
		pageId,
		botUser,
		isProactiveMessage,
		actor,
		messageType,
	}) {
		const userId = _.get(room, 'botUser._id', '').toString();
		const engineId = _.get(room, 'engineId', '').toString();
		const roomId = room._id.toString();
		const channel = room.channel;

		let validResponses = responses;
		if (!_.isArray(responses)) {
			validResponses = [responses];
		}

		const {
			text,
			intents: oldIntents,
			entities: oldEntities,
			nlpIntentsOriginal,
			allParameters,
			messageLogId,
		} = await this.getSuggestionRedis(roomId, engineId);
		await removeSuggestions(roomId, engineId);
		if (!isProactiveMessage) {
			const dataBotUserString = await getFromRedis(`${Constants.REDIS.PREFIX.DATA_BOT_USER}${botUser}`);
			if (dataBotUserString) {
				const dataBotUser = JSON.parse(dataBotUserString);
				const messages = _.get(dataBotUser, "proactiveMessages");
				if (messages && messages.length > 0) {
					for (const message of messages) {
						if (!message.expiredTime || isNaN(message.expiredTime) || message.expiredTime <= 0) continue;

						const scheduledTime = dateTimeHelper.addSecond(new Date(), parseInt(message.expiredTime));
						const url = `${process.env.LIVE_CHAT_SERVER}/v1/timer`;
						const key = `${Constants.REDIS.PREFIX.PROACTIVE_MESSAGE}${botUser}_${engineId}_${pageId}_${message._id}`;
						scheduleService.createJob(url, 'POST', { key, }, scheduledTime, key);
					}
				}
			}
		}
		const url = `${process.env.NLP_SERVER}/api/v1/agents/messages`;
		await axios.post(url, {
			text,
			userId,
			channel,
			intents,
			oldIntents,
			entities,
			oldEntities,
			pageId,
			messageLogId,
			nlpIntentsOriginal,
			allParameters,
			isStartedByBot: isProactiveMessage,
			actor,
			responses: validResponses,
			messageType,
		}, {
			headers: {
				authorization: process.env.SERVER_API_KEY,
				engineid: engineId,
			},
		});
	}

	async getSuggestionRedis(roomId, engineId) {
		const data = await hmGetFromRedis(
			engineId.toString(),
			roomId.toString()
		);
		try {
			const suggestions = JSON.parse(data);
			if (typeof suggestions === 'object') {
				return suggestions;
			}
		} catch (error) {
		}
		return {};
	}

	async setStopBot(roomId, botUserId, engineId) {
		const stopPrefix = `${Constants.REDIS.PREFIX.STOP_BOT}${botUserId}_${engineId}`;

		const stopStatus = {
			isStopped: true,
		};


		await this.removeTimer(roomId, botUserId, engineId);
		sendClearTimer(roomId, engineId);
		await publishStopBot(engineId, botUserId, stopStatus);

		return setExToRedis(
			stopPrefix,
			Constants.REDIS.ROOM.STOP_TIME / 1000,
			JSON.stringify(stopStatus)
		);
	}

	unsetStopBot(botUserId, engineId) {
		const stopPrefix = `${Constants.REDIS.PREFIX.STOP_BOT}${botUserId}_${engineId}`;
		return delFromRedis(stopPrefix);
	}

	checkBotHasStop(botUserId, engineId) {
		return getsStatusBot(botUserId, engineId);
	}

	removeTimer(roomId, botUserId, engineId) {
		const key = `${Constants.REDIS.PREFIX.ROOM}${roomId}_${botUserId}_${engineId}`;
		return scheduleService.deleteJob(key);
	}

	async sendMessageAuto({ suggestions, roomId, engineId, isProactiveMessage, triggers, botUser }) {
		const responses = _.get(suggestions, 'responses', []);
		const masterBot = _.get(suggestions, 'masterBot');
		const pageId = _.get(suggestions, 'pageId');
		const messageType = _.get(suggestions, 'messageType');

		for (const response of responses) {
			const content = _.get(response, 'channelResponses');
			if (!content || (Array.isArray(content) && content.length === 0)) {
				continue;
			}

			const room = await this.sendResponseToLiveChat({
				roomId,
				engineId,
				content,
			});
			const botUserId = _.get(room, 'botUser._id');
			if (!_.isEmpty(triggers)) {
				await this.sendUserInfoToLiveChat({ triggers, engineId, botUser });
			}
			await this.sendToBot({
				room,
				pageId,
				responses: content,
				botUser: botUserId,
				isProactiveMessage,
				messageType,
			});

			if (masterBot && masterBot !== engineId) {
				// TODO: remove suggestion in master
				const masterRoom = await roomRepository.getOne({
					where: {
						'botUser._id': botUserId,
						engineId: masterBot,
					},
					fields: '_id',
				});
				await this.sendResponseToLiveChat({
					content,
					engineId: masterBot,
					roomId: masterRoom._id.toString(),
				});
			}
		}
	}

	async sendUserInfoToLiveChat({ triggers, engineId, botUser }) {
		const tags = _.get(botUser, 'tags', []);
		const userInfo = _.get(triggers, 'userInfo.parameters', {});
		userInfo['tags'] = tags;

		const dataEmit = {
			type: Constants.EVENT_TYPE.SEND_USER_INFO,
			payload: {
				userInfo,
			},
		};

		sendUserInfo(engineId, dataEmit);
	}

	async setTimeoutResponse(listBot, dataChat, botUserId) {
		const promises = dataChat.map(({ room }) => {
			const roomId = room._id.toString();
			const engineId = room.engineId.toString();
			return this.removeTimer(roomId, botUserId, engineId);
		});
		await Promise.all(promises);

		for (let index = 0; index < listBot.length; index++) {
			const { room } = dataChat.find(({ room }) => listBot[index] === room.engineId.toString());
			const roomId = room._id.toString();
			const engineId = room.engineId.toString();

			const scheduledTime = dateTimeHelper.addSecond(new Date(), Constants.REDIS.ROOM.EXPIRE_TIME / 1000 + index);
			const url = `${process.env.LIVE_CHAT_SERVER}/v1/timer`;
			const key = `${Constants.REDIS.PREFIX.ROOM}${roomId}_${botUserId}_${engineId}`;
			await scheduleService.createJob(url, 'POST', { key, }, scheduledTime, key);
		}
	}

	async checkAgentOffline(engineId) {
		if (!engineId) {
			return true;
		}
		const status = await hmGetFromRedis(Constants.REDIS.HASHMAP.STATUS, engineId);
		return status[0] !== 'true';
	}

	async createIncomingMsg({
		botUser,
		listBot,
		content,
		channel,
		orgId,
		pageId,
		platform,
	}) {
		let dataRooms = await getRooms({
			botUser,
			listBot,
			channel,
			orgId,
			pageId,
			platform,
		});

		await updateRooms(dataRooms, botUser);

		const botUserName = botUser.name || Constants.CHAT_CONSTANTS.DEFAULT_NAME;
		const validContent = convertContent(content);

		const dataMessages = await createNewMessages({
			channel,
			botUser: botUser._id,
			content: validContent,
			rooms: dataRooms,
		});

		dataRooms = await updateUnreadAndLastMsg({
			botUserName,
			rooms: dataRooms,
			messages: dataMessages,
		});

		dataRooms = await updateExpiredTime({
			botUserId: botUser._id,
			rooms: dataRooms,
		});

		return dataRooms.map((room, index) => {
			return {
				room,
				message: dataMessages[index],
			};
		});
	}

	async sendMessagesAuto({
		botUser,
		triggers,
		dataChat,
		responses,
		listBot,
		masterBot,
		pageId,
		nlpIntentsOriginal,
		allParameters,
	}) {
		for (let index = 0; index < listBot.length; index++) {
			const { room } = dataChat.find(({ room }) => listBot[index] === room.engineId.toString());
			const engineId = room.engineId.toString();
			const roomId = room._id.toString();
			await this.sendMessageAuto({
				botUser,
				triggers,
				roomId,
				engineId,
				suggestions: {
					masterBot,
					pageId,
					responses: responses[engineId],
					nlpIntentsOriginal,
					allParameters,
				},
			});
		}
	}

	async sendResponseToLiveChat({ roomId, engineId, content }) {
		const { room, message } = await this.sendBotMessage({
			roomId,
			engineId,
			content,
		});
		if (!room) {
			return {};
		}
		const dataEmit = {
			type: Constants.EVENT_TYPE.LAST_MESSAGE_AGENT,
			payload: {
				message,
				room,
			},
		};
		if (!room.agents || room.agents.length === 0) {
			dataEmit.type = Constants.EVENT_TYPE.SEND_UNASSIGNED_CHAT;
		}

		sendBotMessage(engineId, dataEmit);

		const botUserId = _.get(room, 'botUser._id');
		// await removeSuggestions(roomId, engineId);
		await this.removeTimer(roomId, botUserId.toString(), engineId);
		return room;
	}

	async emitResponseToMaster({
		engineId,
		agentId,
		content,
		botUser,
		orgId,
	}) {
		const masterBot = await getMasterBot(engineId, orgId);
		if (!masterBot) {
			return {};
		}

		const roomMaster = await roomRepository.getOne({
			where: {
				orgId,
				engineId: masterBot,
				'botUser._id': botUser,
			},
			fields: '_id channel lastMessage unreadMessages engineId',
			isLean: false,
		});

		if (!roomMaster) {
			return {};
		}

		const { room, message } = await createAgentMsgAndUpdateRoom({
			content,
			agentId,
			room: roomMaster,
			engineId: masterBot,
		});

		const dataEmit = {
			type: Constants.EVENT_TYPE.LAST_MESSAGE_AGENT,
			payload: {
				message,
				room,
			},
		};

		return {
			masterBot,
			dataEmit,
		};
	}

	async agentSeenMessage(lastMessage, userId) {
		if (!lastMessage
			|| !lastMessage._id
			|| (lastMessage.agentSeen && lastMessage.agentSeen.includes(userId))
			|| !userId
		) {
			return;
		}

		const message = await messageRepository.getOneAndUpdate({
			where: {
				_id: lastMessage._id,
			},
			data: {
				$addToSet: { agentSeen: userId },
			},
		});

		sendAgentSeenMessage({ message });
	}

	formatMessageHistory(messages) {
		messages = messages.filter(m => m.action == 'chat');
		const formattedMessages = messages.map(m => {
			let messageObject = {
				_id: m._id,
			};
			if (m.botUser) messageObject.actor = Constants.ACTOR.User;
			else messageObject.actor = Constants.ACTOR.Bot;
			try {
				const objectResponse = JSON.parse(m.content)[0];
				messageObject = {
					...messageObject,
					type: objectResponse.responseType,
				}
				switch (objectResponse.responseType) {
					case Constants.RESPONSE_TYPE.Button:
						messageObject.text = objectResponse.text;
						messageObject.buttons = objectResponse.buttons;
						break;
					case Constants.RESPONSE_TYPE.QuickReply:
						messageObject.text = objectResponse.text;
						messageObject.quickReplies = objectResponse.quickReplies;
						break;
					case Constants.RESPONSE_TYPE.Image:
						messageObject.imageUrl = objectResponse.imageUrl;
						break;
					case Constants.RESPONSE_TYPE.Card:
						messageObject.cards = objectResponse.cards;
						break;
					case Constants.RESPONSE_TYPE.Text:
						messageObject.text = objectResponse.text;
						break;
				}
				return messageObject;
			} catch (e) {
				return {
					...messageObject,
					type: 'text',
					text: m.content,
				};
			}
		});

		return formattedMessages;
	}
}

async function getRooms({ botUser, listBot, channel, orgId, pageId, platform }) {
	const condition = {
		channel,
		orgId,
		engineId: listBot,
		'botUser._id': botUser._id,
	};
	let existedRooms = await roomRepository.getAll({
		where: condition,
		fields: '_id agents channel botUser engineId tags note',
	});

	const hasNewRoom = existedRooms.length < listBot.length;
	let oldListBot = [];
	let newListBot = [];
	let newRooms = [];

	oldListBot = existedRooms.map(room => room.engineId.toString());
	if (hasNewRoom) {
		newListBot = listBot.filter(bot => {
			return !oldListBot.includes(bot);
		});
	}

	if (newListBot.length > 0) {
		const dataRooms = newListBot.map(bot => ({
			channel,
			orgId,
			pageId,
			engineId: bot,
			botUser: {
				_id: botUser._id,
				username: botUser.name,
			},
			platform,
		}));
		newRooms = await roomRepository.create(dataRooms);
	}

	existedRooms = existedRooms.map(room => ({
		...room,
		botUser: {
			_id: botUser._id,
			username: botUser.name,
		},
		isNew: false,
	}));

	newRooms = newRooms.map(room => ({
		...room.toObject(),
		isNew: true,
	}));

	return [
		...existedRooms,
		...newRooms,
	];
}

function removeSuggestions(roomId, engineId) {
	return hmSetToRedis(engineId.toString(), roomId.toString(), '');
}

function convertContent(content) {
	let message = content;
	try {
		const messageObj = JSON.parse(content);
		if (Array.isArray(messageObj)) {
			return content;
		}
		if (typeof messageObj === 'object') {
			return messageObj.title || '';
		}
	} catch (error) { }
	return message;
}

async function getMessagesByLastMessage(lastMessage, roomId) {
	const options = {
		room: roomId,
		_id: {
			$gte: lastMessage,
		},
	};
	const nextMessages = await messageRepository.getMany({
		limit: 4,
		where: options,
		fields: 'botUser agent content createdAt',
	});

	const condition = {
		room: roomId,
		_id: {
			$lt: lastMessage,
		},
	};

	let prevMessages = await messageRepository.getMany({
		limit: 3,
		where: condition,
		fields: 'botUser agent content createdAt',
		sort: { _id: -1 },
	});
	prevMessages = prevMessages.reverse();

	return prevMessages.concat(nextMessages);
}

async function updateUnreadAndLastMsg({ rooms, messages, botUserName }) {
	const messageIds = messages.map(message => message._id);
	const promises = rooms.map((room, index) => {
		const unreadMessages = (room.unreadMessages || 0) + 1;
		const dataUpdate = {
			unreadMessages,
			lastMessage: messageIds[index],
		};
		if (!room.isNew) {
			dataUpdate['botUser.username'] = botUserName;
		}
		return roomRepository.updateOne({
			where: { _id: room._id },
			data: dataUpdate,
		});
	});
	await Promise.all(promises);
	return rooms.map(room => ({
		...room,
		unreadMessages: (room.unreadMessages || 0) + 1,
	}));
}

async function getsStatusBot(botUserId, engineId) {
	const key = `${Constants.REDIS.PREFIX.STOP_BOT}${botUserId}_${engineId}`;
	let dataStopBot = await getFromRedis(key);
	try {
		dataStopBot = JSON.parse(dataStopBot);
		if (typeof dataStopBot === 'object') {
			return dataStopBot.isStopped;
		}
	} catch (error) { }
	return false;
}

async function updateExpiredTime({ rooms, botUserId }) {
	const promises = rooms.map(room => {
		return getsStatusBot(botUserId, room.engineId);
	});

	const statuses = await Promise.all(promises);

	return rooms.map((room, index) => {
		let expiredTime = new Date().getTime() + Constants.REDIS.ROOM.EXPIRE_TIME;
		const isStopped = statuses[index];
		if (isStopped) {
			expiredTime = 0;
		}
		return {
			...room,
			isStopped,
			ttl: expiredTime,
		};
	});
}

async function createNewMessages({
	channel,
	botUser,
	content,
	rooms,
}) {
	if (!content || (Array.isArray(content) && content.length === 0)) {
		return [];
	}
	const promises = [];
	for (const room of rooms) {
		promises.push(
			messageRepository.create({
				botUser,
				content,
				channel,
				room: room._id,
				engineId: room.engineId,
			})
		);
	}


	const messages = await Promise.all(promises);
	return messages.map(message => message.toObject());
}

function convertMessageToString(content) {
	let validContent = content;
	if (typeof validContent === 'object') {
		if (_.isArray(validContent) && validContent.length === 0) {
			return {};
		}
		validContent = JSON.stringify(content);
	}

	return validContent;
}

async function createAgentMsgAndUpdateRoom({ content, agentId, room, engineId }) {
	const validContent = convertMessageToString(content);
	const message = await messageRepository.create({
		engineId,
		room: room._id,
		agent: agentId,
		channel: room.channel,
		content: validContent,
	});

	room.lastMessage = message._id;
	room.unreadMessages = 0;
	await room.save();
	return {
		room: room,
		message: message.toObject(),
	};
}

async function getMasterBot(botId, org) {
	const url = `${process.env.NLP_SERVER}/api/v1/bots/master`;
	const data = await axios.post(url, { botId, org }, {
		headers: {
			authorization: process.env.SERVER_API_KEY,
		},
	});

	return _.get(data, 'data.data');
}

async function updateRooms(rooms, botUser) {
	const promises = [];
	for (const room of rooms) {
		const tags = [];
		for (const tag of botUser.tags) {
			const exist = room.tags.some(t => t.content === tag.content);
			if (!exist) {
				tags.push(tag);
			}
		}
		if (tags.length === 0) continue;

		promises.push(roomRepository.updateOne({
			where: {
				_id: room._id,
			},
			data: {
				$push: { tags },
				note: botUser.note || room.note,
			},
		}));
	}

	if (promises.length === 0) return;

	return Promise.all(promises);
}

module.exports = new MessageService();

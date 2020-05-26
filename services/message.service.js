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
} = require('../services/socket-emitter.service');

class MessageService {
	create({ botUser, engineId, room, content, channel, action }) {
		return messageRepository.create({
			botUser: botUser,
			engineId: engineId,
			room,
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
			fields: 'botUser agent content createdAt',
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
			fields: '_id channel lastMessage botUser unreadMessages engineId',
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

	async emitMessages({
		dataChat,
		intents,
		entities,
		responses,
		masterBot,
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
			}
			sendMessage(dataSending);

			if (intents && intents.length > 0) {
				const dataStore = {
					masterBot,
					responses: responses[engineId],
					text: message.content,
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
		} = await this.getSuggestionRedis(roomId, engineId);
		await removeSuggestions(roomId, engineId);

		const url = `${process.env.NLP_SERVER}/api/v1/agents/messages`;
		await axios.post(url, {
			text,
			userId,
			channel,
			intents,
			oldIntents,
			entities,
			oldEntities,
			responses: validResponses,
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
		return delFromRedis(key);
	}

	async sendMessageAuto({ suggestions, roomId, engineId }) {
		const content = _.get(suggestions, 'responses[0].channelResponses', []);
		const masterBot = _.get(suggestions, 'masterBot');

		const room = await this.sendResponseToLiveChat({
			roomId,
			engineId,
			content,
		});
		await this.sendToBot({
			room,
			responses: content,
		});

		if (masterBot && masterBot !== engineId) {
			const botUser = _.get(room, 'botUser._id');
			const masterRoom = await roomRepository.getOne({
				where: {
					'botUser._id': botUser,
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
			await setExToRedis(
				`${Constants.REDIS.PREFIX.ROOM}${roomId}_${botUserId}_${engineId}`,
				parseInt(Constants.REDIS.ROOM.EXPIRE_TIME / 1000 + index),
				true,
			);
		}
	}

	async checkAgentOffline(engineId) {
		if (!engineId) {
			return true;
		}
		const status = await hmGetFromRedis(Constants.REDIS.HASHMAP.STATUS, engineId);
		return status[0] !== 'true';
	}

	async createIncomingMsg({ botUser, listBot, content, channel, orgId }) {
		let dataRooms = await getRooms({
			botUser,
			listBot,
			channel,
			orgId,
		});

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

	async sendMessagesAuto({ dataChat, responses, listBot, masterBot }) {
		for (let index = 0; index < listBot.length; index++) {
			const { room } = dataChat.find(({ room }) => listBot[index] === room.engineId.toString());
			const engineId = room.engineId.toString();
			const roomId = room._id.toString();
			await this.sendMessageAuto({
				roomId,
				engineId,
				suggestions: {
					masterBot,
					responses: responses[engineId],
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
		await removeSuggestions(roomId, engineId);
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
}

async function getRooms({ botUser, listBot, channel, orgId }) {
	const condition = {
		channel,
		orgId,
		engineId: listBot,
		'botUser._id': botUser._id,
	};
	let existedRooms = await roomRepository.getAll({
		where: condition,
		fields: '_id agents channel botUser engineId',
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
			engineId: bot,
			botUser: {
				_id: botUser._id,
				username: botUser.name,
			},
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

module.exports = new MessageService();

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
} = require('../services/redis.service');
const {
	sendMessage,
	sendClearTimer,
	sendBotMessage,
} = require('../services/socket-emitter.service');

class MessageService {
	async sendMessage({ botUser, engineId, content, channel, isOffline }) {
		const { isNew, room } = await getRoom({ botUser, engineId, channel });
		const roomID = room._id;
		const botUserId = botUser._id;

		const validContent = convertContent(content);
		const message = await this.create({
			channel,
			engineId,
			room: roomID,
			botUser: botUserId,
			content: validContent,
		});

		const unreadMessages = (room.unreadMessages || 0) + 1;
		await roomRepository.updateOne({
			where: {
				_id: roomID,
			},
			data: {
				unreadMessages,
				lastMessage: message._id,
			},
		});

		if (!isOffline) {
			await this.setTimeoutResponse(roomID, botUser._id, engineId);
		}

		const isStoppedBot = await this.checkBotHasStop(
			botUser._id.toString(),
			engineId.toString()
		);

		let expiredTime = new Date().getTime() + Constants.REDIS.ROOM.EXPIRE_TIME;
		if (isStoppedBot) {
			expiredTime = 0;
		}
		return {
			isNew,
			room: {
				...room,
				unreadMessages,
				ttl: expiredTime,
			},
			message: message.toObject(),
		};
	}

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
		let validContent = content;
		if (typeof validContent === 'object') {
			if (_.isArray(validContent) && validContent.length === 0) {
				return {};
			}
			validContent = JSON.stringify(content);
		}
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
		const message = await messageRepository.create({
			engineId,
			room: roomId,
			agent: agentId,
			channel: room.channel,
			content: validContent,
		});

		room.lastMessage = message._id;
		room.unreadMessages = 0;
		await room.save();
		return {
			room,
			message: message.toObject(),
		};
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

	async emitMessage({
		room,
		message,
		intents,
		entities,
		responses,
		engineId,
		isNew,
	}) {
		const roomId = room._id;
		const botUser = _.get(room, 'botUser._id', '').toString();

		const isStoppedBot = await this.checkBotHasStop(botUser, engineId);
		if (!isStoppedBot) {
			const suggestions = await this.getSuggestionRedis(roomId, engineId);
			if (
				typeof suggestions === 'object'
				&& 'responses' in suggestions
				&& !!botUser
			) {
				await this.sendMessageAuto({ suggestions, roomId, engineId });
			}
		}

		if (intents && intents.length > 0) {
			const dataStore = JSON.stringify({
				intents,
				entities,
				responses,
				text: message.content,
			});
			await hmSetToRedis(engineId.toString(), roomId.toString(), dataStore);
		}

		sendMessage({
			room,
			message,
			intents,
			entities,
			responses,
			engineId,
			isNew,
		});
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

	async checkBotHasStop(botUserId, engineId) {
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

	removeTimer(roomId, botUserId, engineId) {
		const key = `${Constants.REDIS.PREFIX.ROOM}${roomId}_${botUserId}_${engineId}`;
		return delFromRedis(key);
	}

	async sendMessageAuto({ suggestions, roomId, engineId }) {
		const content = _.get(suggestions, 'responses[0].channelResponses', []);
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
		if (!room.agents ||room.agents.length === 0) {
			dataEmit.type = Constants.EVENT_TYPE.SEND_UNASSIGNED_CHAT;
		}
		await this.sendToBot({
			room,
			responses: content,
		});
		sendBotMessage(engineId, dataEmit);
		await removeSuggestions(roomId, engineId);
	}

	async setTimeoutResponse(roomId, botUserId, engineId) {
		await this.removeTimer(roomId, botUserId, engineId);
		return setExToRedis(
			`${Constants.REDIS.PREFIX.ROOM}${roomId}_${botUserId}_${engineId}`,
			parseInt(Constants.REDIS.ROOM.EXPIRE_TIME / 1000),
			true,
		);
	}

	async checkAgentOffline(enginedId) {
		const status = await hmGetFromRedis(Constants.REDIS.HASHMAP.STATUS, enginedId);
		return status[0] !== 'true';
	}
}

async function getRoom({ botUser, engineId, channel }) {
	const condition = {
		engineId,
		channel,
		'botUser._id': botUser._id,
	};
	const existedRoom = await roomRepository.getOne({
		where: condition,
		fields: '_id agents channel botUser',
		isLean: false,
	});
	if (existedRoom) {
		existedRoom.botUser.username = botUser.name || Constants.CHAT_CONSTANTS.DEFAULT_NAME;
		await existedRoom.save();
		return {
			room: existedRoom.toObject(),
			isNew: false,
		};
	}

	const newRoom = await roomRepository.create({
		engineId,
		channel,
		botUser: {
			_id: botUser._id,
			username: botUser.name || Constants.CHAT_CONSTANTS.DEFAULT_NAME,
		},
	});

	return {
		room: newRoom.toObject(),
		isNew: true,
	};
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

module.exports = new MessageService();

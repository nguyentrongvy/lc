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
const { sendMessage } = require('../services/socket-emitter.service');

class MessageService {
	async sendMessage({ botUser, nlpEngine, content, channel }) {
		const room = await getRoom({ botUser, nlpEngine, channel });
		const roomID = room._id;

		const validContent = convertContent(content);
		const message = await this.create({
			channel,
			botUser,
			nlpEngine,
			room: roomID,
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

		await setTimeoutRepsonse(roomID, botUser, nlpEngine);

		const isStoppedBot = await this.checkBotHasStop(
			botUser.toString(),
			nlpEngine.toString()
		);

		let expiredTime = new Date().getTime() + Constants.REDIS.ROOM.EXPIRE_TIME;
		if (isStoppedBot) {
			expiredTime = 0;
		}
		return {
			room: {
				...room,
				unreadMessages,
				ttl: expiredTime,
			},
			message: message.toObject(),
		};
	}

	create({ botUser, nlpEngine, room, content, channel, action }) {
		return messageRepository.create({
			botUser: botUser,
			nlpEngine: nlpEngine,
			room,
			content: content,
			channel: channel,
			action: (action ? action : Constants.ACTION.CHAT),
		});
	}

	async getMessagesByRoomID({ search, lastMessage, roomID }) {
		const condition = {
			room: roomID,
		};
		if (lastMessage) {
			condition._id = {
				$lt: lastMessage,
			};
		}
		if (search) {
			condition.content = new RegExp(search, 'gi');
		}
		const sortCondition = {
			createdAt: -1,
		};
		const messages = await messageRepository.getAll({
			where: condition,
			sort: sortCondition,
			fields: 'botUser agent content createdAt',
		});

		return messages;
	}

	async sendAgentMessage({ agentId, roomId, content, nlpEngine }) {
		let validContent = content;
		if (typeof validContent === 'object') {
			validContent = JSON.stringify(content);
		}
		const room = await roomRepository.getOne({
			where: {
				nlpEngine,
				_id: roomId,
				'agents': agentId,
			},
			fields: '_id channel lastMessage botUser unreadMessages nlpEngine',
			isLean: false,
		});
		if (!room) {
			throw new Error(Constants.ERROR.ROOM_NOT_FOUND);
		}
		const message = await messageRepository.create({
			nlpEngine,
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

	async sendBotMessage({ roomId, content, nlpEngine }) {
		const room = await roomRepository.getOneAndUpdate({
			where: {
				nlpEngine,
				_id: roomId,
			},
			data: {
				unreadMessages: 0,
			},
			fields: '_id channel lastMessage botUser agents nlpEngine',
			isLean: false,
		});
		if (!room) {
			throw new Error(Constants.ERROR.ROOM_NOT_FOUND);
		}
		const message = await messageRepository.create({
			nlpEngine,
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
		nlpEngine,
	}) {
		const roomId = room._id;
		const dataStore = JSON.stringify({
			intents,
			entities,
			responses,
			text: message.content,
		});
		await hmSetToRedis(nlpEngine.toString(), roomId.toString(), dataStore);
		sendMessage({
			room,
			message,
			intents,
			entities,
			responses,
			nlpEngine,
		});
	}

	async sendToBot({
		room,
		intents,
		entities,
		responses,
	}) {
		const userId = _.get(room, 'botUser._id', '').toString();
		const nlpEngine = _.get(room, 'nlpEngine', '').toString();
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
		} = await this.getSuggestionRedis(roomId, nlpEngine);
		await removeSuggestions(roomId, nlpEngine);

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
				engineid: nlpEngine,
			},
		});
	}

	async getSuggestionRedis(roomId, nlpEngine) {
		const data = await hmGetFromRedis(
			nlpEngine.toString(),
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

	setStopBot(botUserId, nlpEngine) {
		const stopPrefix = `${Constants.REDIS.PREFIX.STOP_BOT}${botUserId}_${nlpEngine}`;

		const stopStatus = {
			isStopped: true,
		};
		return setExToRedis(
			stopPrefix,
			Constants.REDIS.ROOM.STOP_TIME / 1000,
			JSON.stringify(stopStatus)
		);
	}

	unsetStopBot(botUserId, nlpEngine) {
		const stopPrefix = `${Constants.REDIS.PREFIX.STOP_BOT}${botUserId}_${nlpEngine}`;
		return delFromRedis(stopPrefix);
	}

	async checkBotHasStop(botUserId, nlpEngine) {
		const key = `${Constants.REDIS.PREFIX.STOP_BOT}${botUserId}_${nlpEngine}`;
		let dataStopBot = await getFromRedis(key);
		try {
			dataStopBot = JSON.parse(dataStopBot);
			if (typeof dataStopBot === 'object') {
				return dataStopBot.isStopped;
			}
		} catch (error) { }
		return false;
	}
}

function getRoom({ botUser, nlpEngine, channel }) {
	const options = {
		where: {
			nlpEngine,
			channel,
			'botUser._id': botUser,
		},
		options: {
			upsert: true,
		},
		data: {
			'botUser.username': botUser.userName || '',
		},
		fields: '_id agents',
	};

	return roomRepository.getOneAndUpdate(options);
}

function removeSuggestions(roomId, nlpEngine) {
	return hmSetToRedis(nlpEngine, roomId, '');
}

function setTimeoutRepsonse(roomId, botUserId, nlpEngine) {
	return setExToRedis(
		`${Constants.REDIS.PREFIX.ROOM}${roomId}_${botUserId}_${nlpEngine}`,
		parseInt(Constants.REDIS.ROOM.EXPIRE_TIME / 1000),
		true,
	);
}

function convertContent(content) {
	let message = content;
	try {
		const messageObj = JSON.parse(content);
		if (typeof messageObj === 'object') {
			return messageObj.title || '';
		}
	} catch (error) {}
	return message;
}

module.exports = new MessageService();

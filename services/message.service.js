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
} = require('../services/redis.service');
const { sendMessage } = require('../services/socket-emitter.service');

class MessageService {
	async sendMessage({ botUser, nlpEngine, content, channel }) {
		const room = await getRoom({ botUser, nlpEngine, channel });
		const roomID = room._id;
		const message = await this.create({
			roomID,
			content,
			channel,
			botUser,
			nlpEngine,
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

		await setExToRedis(
			`${Constants.REDIS.PREFIX.ROOM}${roomID}_${nlpEngine}`,
			parseInt(Constants.REDIS.ROOM.EXPIRE_TIME / 1000),
			true,
		);

		const expiredTime = new Date().getTime() + Constants.REDIS.ROOM.EXPIRE_TIME;
		return {
			room: {
				...room,
				ttl: expiredTime,
			},
			message: message.toObject(),
		};
	}

	create({ botUser, nlpEngine, roomID, content, channel, action }) {
		return messageRepository.create({
			botUser: botUser,
			nlpEngine: nlpEngine,
			room: roomID,
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
			content,
			nlpEngine,
			room: roomId,
			agent: agentId,
			channel: room.channel,
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
		const room = await roomRepository.getOne({
			where: {
				nlpEngine,
				_id: roomId,
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
		// TODO: change format message
		let validResponses = responses;
		if (!_.isArray(responses)) {
			validResponses = [responses];
		}

		const {
			text,
			intents: oldIntents,
			entities: oldEntities,
		} = await this.getSuggestionRedis(roomId, nlpEngine);

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
		await removeSuggestions(roomId, nlpEngine);
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

module.exports = new MessageService();

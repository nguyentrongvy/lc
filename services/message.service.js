const {
	messageRepository,
	roomRepository,
} = require('../repositories');
const Constants = require('../common/constants');
const { hmSetToRedis } = require('../services/redis.service');
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
		return {
			room,
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
			fields: '_id channel lastMessage botUser',
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
		await room.save();
		return {
			room,
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
		});
		await hmSetToRedis('suggestions', roomId.toString(), dataStore);
		sendMessage({
			room,
			message,
			intents,
			entities,
			responses,
			nlpEngine,
		});
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

module.exports = new MessageService();

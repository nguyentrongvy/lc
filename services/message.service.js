const {
	messageRepository,
	roomRepository,
} = require('../repositories');
const Constants = require('../common/constants');

class MessageService {
	async sendMessage({ botUser, nlpEngine, content, channel }) {
		const room = await getRoom(botUser, nlpEngine);
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
		return message.toObject();
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

	async getMessagesByRoomID({ search, page, limit, roomID }) {
		const condition = {
			room: roomID,
		};
		if (search) {
			condition.content = new RegExp(search, 'gi');
		}
		const sortCondition = {
			createdAt: -1,
		};
		const messages = await messageRepository.getAll({
			page,
			limit,
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
			fields: '_id channel lastMessage',
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
		return message.toObject();
	}
}

function getRoom(botUser, nlpEngine) {
	const options = {
		where: {
			'botUser._id': botUser,
			'nlpEngine': nlpEngine,
		},
		options: {
			upsert: true,
		},
		data: {
			'botUser.username': userName,
		},
		fields: '_id',
	};

	return roomRepository.getOneAndUpdate(options);
}

module.exports = new MessageService();

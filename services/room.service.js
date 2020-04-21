const axios = require('axios');
const _ = require('lodash');

const { roomRepository } = require('../repositories');
const Constants = require('../common/constants');
const messageService = require('./message.service');
const usersService = require('./users.service');

class RoomService {
	getUnassignedRooms({ page, limit }) {
		const condition = {
			$or: [
				{
					agents: {
						$size: 0,
					}
				},
				{ agents: null },
			],
		};
		return getRooms(condition, page, limit);
	}

	getAssignedRooms({ page, limit, agentId }) {
		const condition = {
			agents: {
				$elemMatch: {
					$nin: [agentId],
				},
			},
			$expr: {
				$gte: [{ $size: "$agents" }, 1],
			},
		};

		return getRooms(condition, page, limit);
	}

	getOwnRooms({ page, limit, agentId }) {
		const condition = {
			agents: agentId,
			$expr: {
				$gte: [{ $size: "$agents" }, 1],
			},
		};
		return getRooms(condition, page, limit);
	}

	async joinRoom({ roomID, agentID, nlpEngine, adminID }) {
		const options = {
			where: {
				$or: [
					{
						agents: {
							$size: 0,
						}
					},
					{ agents: null },
				],
				_id: roomID,
			},
			fields: 'agents channel',
			isLean: false,
		};
		const room = await roomRepository.getOne(options);
		if (!room) {
			throw new Error(Constants.ERROR.ROOM_NOT_FOUND);
		}

		room.agents = [agentID];
		await room.save();

		const userName = await usersService.getUser(agentID);
		let content;
		if (!adminID) {
			content = `${userName} has joined this room.`;
		} else {
			const userNameAdmin = await usersService.getUser(adminID);
			content = `${userNameAdmin} has assigned ${userName} to this room.`;
		}
		const action = Constants.ACTION.JOIN_ROOM;
		await messageService.create({
			nlpEngine,
			content,
			action,
			agent: agentID,
			room: roomID,
			channel: room.channel,
		});

		return room;
	}

	async leftRoom({ roomID, agentID, nlpEngine }) {
		const options = {
			where: {
				_id: roomID,
				agents: agentID,
			},
			data: {
				agent: [],
			},
			fields: 'channel',
		};
		const room = await roomRepository.getOneAndUpdate(options);
		if (!room) {
			throw new Error(Constants.ERROR.ROOM_NOT_FOUND);
		}

		const userName = await usersService.getUser(agentID);
		const action = Constants.ACTION.LEFT_ROOM;
		const content = `${userName} has left this room.`;
		await messageService.create({
			nlpEngine,
			content,
			action,
			agent: agentID,
			channel: room.channel,
			room: roomID,
		});
		return room;
	}

	async getRoom({ roomId, agentId }) {
		const room = await roomRepository.getOne({
			where: {
				_id: roomId,
				agents: [agentId],
			},
			fields: 'botUser channel note tags',
			populate: {
				path: 'tags',
				select: 'content',
			},
		});
		const botUser = await getBotUserByUserId(roomId);

		return { room, botUser };
	}
}

module.exports = new RoomService();

function getRooms(condition, page, limit) {
	return roomRepository.getAll({
		page,
		limit,
		where: condition,
		fields: 'botUser lastMessage channel',
		populate: {
			path: 'lastMessage',
			select: 'content createdAt botUser agent',
		},
		sort: {
			updatedAt: -1,
		},
	});
}

async function getBotUserByUserId(roomID) {
	const option = {
		where: {
			_id: roomID,
		},
		fields: 'botUser',
	};
	const room = await roomRepository.getOne(option);
	const userId = room.botUser._id;
	const url = `${process.env.AUTH_SERVER}/v1/bot/users/${userId}`;
	const res = await axios.get(url, {
		headers: { authorization: process.env.SERVER_API_KEY }
	});

	const botUser = _.get(res, 'data.data', '');

	return botUser;
}

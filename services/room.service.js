const axios = require('axios');
const _ = require('lodash');

const { roomRepository } = require('../repositories');
const Constants = require('../common/constants');
const messageService = require('./message.service');
const usersService = require('./users.service');

class RoomService {
	getUnassignedRooms(lastRoom) {
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
		if (lastRoom) {
			condition._id = {
				$lt: lastRoom,
			};
		}
		return getRooms(condition);
	}

	async getAssignedRooms({ lastRoom, agentId }) {
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
		if (lastRoom) {
			condition._id = {
				$lt: lastRoom,
			};
		}

		return getRooms(condition);
	}

	getOwnRooms({ lastRoom, agentId }) {
		const condition = {
			agents: agentId,
			$expr: {
				$gte: [{ $size: "$agents" }, 1],
			},
		};
		if (lastRoom) {
			condition._id = {
				$lt: lastRoom,
			};
		}
		return getRooms(condition);
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

	async getRoom({roomId, agentId}) {
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
		return room;
	}
}

module.exports = new RoomService();

function getRooms(condition) {
	return roomRepository.getAll({
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

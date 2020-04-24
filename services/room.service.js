const _ = require('lodash');
const axios = require('axios');
const {
	roomRepository,
	tagRepository,
} = require('../repositories');
const Constants = require('../common/constants');
const messageService = require('./message.service');
const usersService = require('./users.service');
const { hmGetFromRedis } = require('../services/redis.service');

class RoomService {
	getUnassignedRooms({ page, limit, search }) {
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
		if (search) {
			condition['botUser.username'] = new RegExp(search, 'gi');
		}
		return getRooms(condition, page, limit);
	}

	getAssignedRooms({ page, limit, agentId, search }) {
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
		if (search) {
			condition['botUser.username'] = new RegExp(search, 'gi');
		}

		return getRooms(condition, page, limit);
	}

	getOwnRooms({ page, limit, agentId, search }) {
		const condition = {
			agents: agentId,
			$expr: {
				$gte: [{ $size: "$agents" }, 1],
			},
		};
		if (search) {
			condition['botUser.username'] = new RegExp(search, 'gi');
		}

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
				agents: [],
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
		const suggestions = await getSuggestionRedis(roomId);
		return {
			...room,
			suggestions,
			botUser,
		};
	}

	async updateRoomById({ roomId, tags, note }) {
		await createTag(tags);

		tags = _.uniqBy(tags, 'content');
		const options = {
			where: {
				_id: roomId,
			},
			data: {
				tags: tags,
				note: note,
			},
			fields: "tags note",
		};

		return await roomRepository.getOneAndUpdate(options);
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

async function getSuggestionRedis(roomId) {
	const data = await hmGetFromRedis('suggestions', roomId);
	try {
		return JSON.parse(data);
	} catch (error) {
		return {};
	}
}

async function createTag(tags) {
	// find tags exist db.
	const tagsName = tags.map(tag => tag.content);
	const existingTags = await tagRepository.getAll({
		where: {
			content: tagsName,
		},
		fields: "content",
	})

	// create tags new.
	
	const tagsNew = _.difference(tagsName, existingTags);
	if (tagsNew && tagsNew.length != 0) {
		await tagRepository.create(tagsNew);
	}
}
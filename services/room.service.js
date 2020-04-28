const _ = require('lodash');
const axios = require('axios');
const {
	roomRepository,
	tagRepository,
} = require('../repositories');
const Constants = require('../common/constants');
const messageService = require('./message.service');
const usersService = require('./users.service');
const {
	getTtlRedis,
	getMultiKey,
	getFromRedis,
} = require('./redis.service');

class RoomService {
	async getUnassignedRooms({ page, limit, search, nlpEngine }) {
		const condition = {
			nlpEngine,
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
		const rooms = await getRooms(condition, page, limit);
		return await getRoomWithConfig(rooms, nlpEngine);
	}

	getAssignedRooms({ page, limit, agentId, nlpEngine, search }) {
		const condition = {
			nlpEngine,
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

	async getOwnRooms({ page, limit, agentId, nlpEngine, search }) {
		const condition = {
			nlpEngine,
			agents: agentId,
			$expr: {
				$gte: [{ $size: "$agents" }, 1],
			},
		};
		if (search) {
			condition['botUser.username'] = new RegExp(search, 'gi');
		}
		const rooms = await getRooms(condition, page, limit);
		return await getRoomWithConfig(rooms, nlpEngine);
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

	async getRoom({ roomId, nlpEngine }) {
		let room = await roomRepository.getOne({
			where: {
				nlpEngine,
				_id: roomId,
			},
			fields: 'botUser channel note tags nlpEngine unreadMessages agents',
			populate: {
				path: 'tags',
				select: 'content',
			},
		});
		if (!room) {
			throw new Error(Constants.ERROR.ROOM_NOT_FOUND);
		}
		room = await getRoomWithStopFlag(room, nlpEngine);
		const botUser = await getBotUserByUserId(roomId);
		if (room.isStopped) {
			return {
				...room,
				suggestions: {},
				botUser,
			};
		}

		const suggestions = await messageService.getSuggestionRedis(roomId, nlpEngine);
		return {
			...room,
			suggestions,
			botUser,
		};
	}

	async updateRoomById({ roomId, tags, note, nlpEngine, unreadMessages, botUserId, name, phoneNumber, address }) {
		const tagsCreated = await createTags(tags, nlpEngine);
		const tagsId = tagsCreated.map(tag => tag._id);
		const data = {
			'tags': tagsId || [],
			'note': note || '',
			'botUser.username': name || '',
		};
		if (unreadMessages || unreadMessages == 0) {
			data.unreadMessages = unreadMessages;
		}
		const options = {
			where: {
				_id: roomId,
			},
			data,
			fields: "tags note",
		};

		// TODO: update botUser
		await updateBotUserId({ botUserId, name, phoneNumber, address });

		return await roomRepository.getOneAndUpdate(options);
	}

	async stopBot(roomId, nlpEngine) {
		const room = await roomRepository.getOne({
			where: {
				nlpEngine,
				_id: roomId,
			},
			fields: 'botUser',
		});
		if (!room) {
			throw new Error(Constants.ERROR.ROOM_NOT_FOUND);
		}
		const botUser = room.botUser;
		const botUserId = botUser._id.toString();
		return messageService.setStopBot(botUserId, nlpEngine);
	}

	async startBot(roomId, nlpEngine) {
		const room = await roomRepository.getOne({
			where: {
				nlpEngine,
				_id: roomId,
			},
			fields: 'botUser',
		});
		if (!room) {
			throw new Error(Constants.ERROR.ROOM_NOT_FOUND);
		}
		const botUser = room.botUser;
		const botUserId = botUser._id.toString();
		return messageService.unsetStopBot(botUserId, nlpEngine);
	}

	countUnassignedRooms(nlpEngine) {
		return roomRepository.count({
			nlpEngine,
			$or: [
				{
					agents: {
						$size: 0,
					}
				},
				{ agents: null },
			],
		});
	}
}

module.exports = new RoomService();

function getRooms(condition, page, limit) {
	return roomRepository.getAll({
		page,
		limit,
		where: condition,
		fields: 'botUser lastMessage channel unreadMessages agents',
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
	const userId = room.botUser._id.toString();
	const url = `${process.env.NLP_SERVER}/v1/bot/users/${userId}`;
	const res = await axios.get(url, {
		headers: { authorization: process.env.SERVER_API_KEY }
	});

	const botUser = _.get(res, 'data.data', '');

	return botUser;
}

async function updateBotUserId({ botUserId, name, phoneNumber, address }) {
	try {
		const data = {
			name,
			phoneNumber,
			address,
		};
		const url = `${process.env.NLP_SERVER}/v1/bot/users/${botUserId}`;
		const headers = {
			headers: { authorization: process.env.SERVER_API_KEY }
		};
		const res = await axios.put(
			url,
			data,
			headers,
		);
		const botUser = _.get(res, 'data.data', '');
		return {
			name: botUser.name,
			phoneNumber: botUser.phoneNumber,
			address: botUser.address,
			_id: botUser._id,
		}
	} catch (err) {
		console.error(err);
	}
}

async function createTags(tags, nlpEngine) {
	if (!tags) return [];
	const tagsUnique = _.uniqBy(tags, 'content');
	// find tags exist db.
	const inputTags = tagsUnique.map(tag => tag.content);
	const existingTags = await tagRepository.getAll({
		where: {
			content: inputTags,
		},
		fields: "content",
	});
	if (!existingTags || existingTags.length == 0) return tagsUnique;

	const tagsNew = tagsUnique.reduce((initValue, currentValue) => {
		const exist = existingTags.some(tag => tag.content == currentValue.content);
		if (!exist) {
			initValue.push({ content: currentValue.content, nlpEngine: nlpEngine });
		}
		return initValue;
	}, []);

	let tagsCreated = [];
	if (tagsNew && tagsNew.length != 0) {
		tagsCreated = await tagRepository.create(tagsNew);
		tagsCreated = tagsCreated.map(({ _id, content }) => ({ _id, content }));
	}

	return [...existingTags, ...tagsCreated];
}

async function getRoomWithConfig(rooms, nlpEngine) {
	let validRooms = await getRoomsWithTimer(rooms, nlpEngine);
	return await getRoomsWithStopFlag(validRooms, nlpEngine);
}

async function getRoomsWithTimer(rooms, nlpEngine) {
	const nlpEngineStr = nlpEngine.toString();
	const keys = rooms.map(room => {
		const id = room._id.toString();
		const botUserId = _.get(room, 'botUser._id', '').toString();
		return `${Constants.REDIS.PREFIX.ROOM}${id}_${botUserId}_${nlpEngineStr}`;
	});
	const ttls = await getTtlRedis(keys);
	const now = new Date().getTime();
	return rooms.map((room, i) => {
		return {
			...room,
			ttl: now + ttls[i] * 1000,
		};
	});
}

async function getRoomsWithStopFlag(rooms, nlpEngine) {
	const nlpEngineStr = nlpEngine.toString();
	const keys = rooms.map(room => {
		const botUserId = _.get(room, 'botUser._id', '').toString();
		return `${Constants.REDIS.PREFIX.STOP_BOT}${botUserId}_${nlpEngineStr}`;
	});
	const data = await getMultiKey(keys);
	return rooms.map((room, i) => {
		const stopFlag = convertDataRedis(data[i]);
		return {
			...room,
			isStopped: stopFlag.isStopped,
		};
	});
}

async function getRoomWithStopFlag(room, nlpEngine) {
	const nlpEngineStr = nlpEngine.toString();
	const botUserId = _.get(room, 'botUser._id', '').toString();
	const key = `${Constants.REDIS.PREFIX.STOP_BOT}${botUserId}_${nlpEngineStr}`;
	const data = await getFromRedis(key);
	const stopFlag = convertDataRedis(data);
	return {
		...room,
		isStopped: stopFlag.isStopped,
	};
}

function convertDataRedis(dataRedis) {
	if (!dataRedis) {
		return {};
	}
	let data = dataRedis;
	try {
		data = JSON.parse(data);
		if (typeof data === 'object') {
			return data;
		}
	} catch (error) {
	}
	return {};
}

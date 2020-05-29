const _ = require('lodash');
const axios = require('axios');
const {
	roomRepository,
	tagRepository,
} = require('../repositories');
const Constants = require('../common/constants');
const messageService = require('./message.service');
const usersService = require('./users.service');
const { sendJoinRoom, sendLeftRoom } = require('./socket-emitter.service');
const {
	getTtlRedis,
	getMultiKey,
	getFromRedis,
} = require('./redis.service');

class RoomService {
	async getUnassignedRooms({ page, limit, search, engineId, flag }) {
		const condition = {
			engineId,
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
			if (flag == Constants.FLAG.SEARCH_BY_ROOM_NAME) {
				condition['botUser.username'] = new RegExp(search, 'gi');
			} else {
				condition['tags.content'] = new RegExp(search, 'gi');
			}
		}
		const rooms = await getRooms(condition, page, limit);
		return await getRoomWithConfig(rooms, engineId);
	}

	getAssignedRooms({ page, limit, agentId, engineId, search, flag }) {
		const condition = {
			engineId,
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
			if (flag == Constants.FLAG.SEARCH_BY_ROOM_NAME) {
				condition['botUser.username'] = new RegExp(search, 'gi');
			} else {
				condition['tags.content'] = new RegExp(search, 'gi');
			}
		}

		return getRooms(condition, page, limit);
	}

	async getOwnRooms({ page, limit, agentId, engineId, search, flag }) {
		const condition = {
			engineId,
			agents: agentId,
			$expr: {
				$gte: [{ $size: "$agents" }, 1],
			},
		};

		if (search) {
			if (flag == Constants.FLAG.SEARCH_BY_ROOM_NAME) {
				condition['botUser.username'] = new RegExp(search, 'gi');
			} else {
				condition['tags.content'] = new RegExp(search, 'gi');
			}
		}
		const rooms = await getRooms(condition, page, limit);

		return await getRoomWithConfig(rooms, engineId);
	}

	async joinRoom({ botUserId, roomID, agentID, engineId, adminID }) {
		const options = {
			where: {
				engineId,
				$or: [
					{
						agents: {
							$size: 0,
						}
					},
					{ agents: null },
				],
			},
			fields: 'agents channel',
			isLean: false,
		};
		if (roomID) {
			options.where._id = roomID;
		} else if (botUserId) {
			options.where['botUser._id'] = botUserId;
		}
		const room = await roomRepository.getOne(options);
		if (!room) {
			throw new Error(Constants.ERROR.ROOM_NOT_FOUND);
		}

		room.agents = [agentID];
		await room.save();

		const [
			userName,
			suggestions,
			botUser,
		] = await Promise.all([
			usersService.getUser(agentID),
			messageService.getSuggestionRedis(room._id.toString(), engineId),
			getBotUserByUserId(room._id.toString()),
		]);

		let content;
		if (!adminID) {
			content = `${userName} has joined this room.`;
		} else {
			const userNameAdmin = await usersService.getUser(adminID);
			content = `${userNameAdmin} has assigned ${userName} to this room.`;
		}
		const action = Constants.ACTION.JOIN_ROOM;
		const message = await messageService.create({
			engineId,
			content,
			action,
			agent: agentID,
			room: room._id.toString(),
			channel: room.channel,
		});

		sendJoinRoom(engineId, {
			...room.toObject(),
			suggestions,
			botUser,
		}, message.toObject());
		return message.toObject();
	}

	async leftRoom({ roomID, agentID, engineId }) {
		const options = {
			where: {
				engineId,
				_id: roomID,
				agents: agentID,
			},
			data: {
				agents: [],
			},
			fields: 'channel botUser',
		};
		const room = await roomRepository.getOneAndUpdate(options);
		if (!room) {
			throw new Error(Constants.ERROR.ROOM_NOT_FOUND);
		}

		const userName = await usersService.getUser(agentID);
		const action = Constants.ACTION.LEFT_ROOM;
		const content = `${userName} has left this room.`;
		await messageService.create({
			engineId,
			content,
			action,
			agent: agentID,
			channel: room.channel,
			room: roomID,
		});
		const botUserId = room.botUser._id.toString();
		await messageService.unsetStopBot(botUserId, engineId);
		sendLeftRoom(engineId);
		return room;
	}

	async getRoom({ roomId, engineId }) {
		let room = await roomRepository.getOne({
			where: {
				engineId,
				_id: roomId,
			},
			fields: 'botUser channel note tags engineId unreadMessages agents',
		});
		if (!room) {
			throw new Error(Constants.ERROR.ROOM_NOT_FOUND);
		}
		room = await getRoomWithStopFlag(room, engineId);
		const botUser = await getBotUserByUserId(roomId);
		if (room.isStopped) {
			return {
				...room,
				suggestions: {},
				botUser,
			};
		}

		const suggestions = await messageService.getSuggestionRedis(roomId, engineId);
		return {
			...room,
			suggestions,
			botUser,
		};
	}

	async updateRoomById({ roomId, tags, note, engineId, botUserId, name, phoneNumber, address, email }) {
		const tagsCreated = await createTags(tags, engineId);
		const data = {
			'tags': tagsCreated || [],
			'note': note || '',
			'botUser.username': name || Constants.CHAT_CONSTANTS.DEFAULT_NAME,
		};
		const options = {
			where: {
				engineId,
				_id: roomId,
			},
			data,
			fields: "tags note",
		};

		// TODO: update botUser
		await updateBotUserId({ botUserId, name, phoneNumber, address, tagsCreated, email });

		return await roomRepository.getOneAndUpdate(options);
	}

	async updateUnreadMessages({ roomId, unreadMessages }) {
		const options = {
			where: {
				_id: roomId,
			},
			data: {
				unreadMessages: unreadMessages
			},
			fields: "tags note",
		};

		return await roomRepository.getOneAndUpdate(options);
	}

	async stopBot(roomId, engineId) {
		const room = await roomRepository.getOne({
			where: {
				engineId,
				_id: roomId,
			},
			fields: 'botUser',
		});
		if (!room) {
			throw new Error(Constants.ERROR.ROOM_NOT_FOUND);
		}
		const botUser = room.botUser;
		const botUserId = botUser._id.toString();
		return messageService.setStopBot(roomId, botUserId, engineId);
	}

	async startBot(roomId, engineId) {
		const room = await roomRepository.getOne({
			where: {
				engineId,
				_id: roomId,
			},
			fields: 'botUser',
		});
		if (!room) {
			throw new Error(Constants.ERROR.ROOM_NOT_FOUND);
		}
		const botUser = room.botUser;
		const botUserId = botUser._id.toString();
		return messageService.unsetStopBot(botUserId, engineId);
	}

	countUnassignedRooms(engineId) {
		return roomRepository.count({
			engineId,
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
	return roomRepository.getMany({
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

async function updateBotUserId({ botUserId, name, phoneNumber, address, tagsCreated, email }) {
	try {
		const data = {
			name,
			phoneNumber,
			address,
			tagsCreated,
			email,
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

async function createTags(tags, engineId) {
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
	const tagsNew = tagsUnique.reduce((initValue, currentValue) => {
		const exist = existingTags.some(tag => tag.content == currentValue.content);
		if (!exist) {
			initValue.push({ content: currentValue.content, engineId: engineId });
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

async function getRoomWithConfig(rooms, engineId) {
	let validRooms = await getRoomsWithTimer(rooms, engineId);
	return await getRoomsWithStopFlag(validRooms, engineId);
}

async function getRoomsWithTimer(rooms, engineId) {
	const nlpEngineStr = engineId.toString();
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

async function getRoomsWithStopFlag(rooms, engineId) {
	const nlpEngineStr = engineId.toString();
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

async function getRoomWithStopFlag(room, engineId) {
	const nlpEngineStr = engineId.toString();
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

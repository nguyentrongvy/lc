const { ResponseSuccess } = require('../helpers/response.helper');
const Constants = require('../common/constants');
const roomService = require('../services/room.service');

class RoomController {
	async getUnassignedRooms(req, res, next) {
		try {
			const nlpEngine = req.nlpEngine._id;
			const { page, limit, search, flag } = req.query;
			const rooms = await roomService.getUnassignedRooms({
				page,
				limit,
				nlpEngine,
				search,
				flag,
			});
			return ResponseSuccess(Constants.SUCCESS.GET_ROOMS, rooms, res);
		} catch (error) {
			next(error);
		}
	}

	async getAssignedRooms(req, res, next) {
		try {
			const nlpEngine = req.nlpEngine._id;
			const agentId = req.user._id;
			const { page, limit, search, flag } = req.query;
			const rooms = await roomService.getAssignedRooms({
				page,
				limit,
				agentId,
				nlpEngine,
				search,
				flag,
			});
			return ResponseSuccess(Constants.SUCCESS.GET_ROOMS, rooms, res);
		} catch (error) {
			next(error);
		}
	}

	async getOwnRooms(req, res, next) {
		try {
			const nlpEngine = req.nlpEngine._id;
			const agentId = req.user._id;
			const { page, limit, search, flag } = req.query;
			const rooms = await roomService.getOwnRooms({
				page,
				limit,
				agentId,
				nlpEngine,
				search,
				flag,
			});
			return ResponseSuccess(Constants.SUCCESS.GET_ROOMS, rooms, res);
		} catch (error) {
			next(error);
		}
	}

	async joinRoom(req, res, next) {
		try {
			const roomID = req.params.id;
			const agentID = req.user._id;
			const nlpEngine = req.nlpEngine._id;
			const message = await roomService.joinRoom({
				roomID,
				agentID,
				nlpEngine,
			});
			return ResponseSuccess(Constants.SUCCESS.JOIN_ROOM, message, res);
		} catch (error) {
			next(error);
		}
	}

	async assignAgentToRoom(req, res, next) {
		try {
			const roomID = req.params.id;
			const adminID = req.user._id;
			const nlpEngine = req.nlpEngine._id;
			const {
				agentID,
			} = req.body;
			const message = await roomService.joinRoom({
				roomID,
				agentID,
				nlpEngine,
				adminID,
			});
			return ResponseSuccess(Constants.SUCCESS.JOIN_ROOM, message, res);
		} catch (error) {
			next(error);
		}
	}


	async leftRoom(req, res, next) {
		try {
			const roomID = req.params.id;
			const agentID = req.user._id;
			const nlpEngine = req.nlpEngine._id;
			await roomService.leftRoom({
				roomID,
				agentID,
				nlpEngine,
			});

			return ResponseSuccess(Constants.SUCCESS.LEFT_ROOM, null, res);
		} catch (error) {
			next(error);
		}
	}

	async getRoom(req, res, next) {
		try {
			const roomId = req.params.id;
			const nlpEngine = req.nlpEngine._id;
			const data = await roomService.getRoom({ roomId, nlpEngine });
			return ResponseSuccess(Constants.SUCCESS.GET_ROOM, data, res);
		} catch (error) {
			next(error);
		}
	}

	async updateRoomById(req, res, next) {
		try {
			const roomId = req.params.id;
			const nlpEngine = req.nlpEngine._id;
			const {
				tags,
				note,
				botUserId,
				name,
				phoneNumber,
				address,
			} = req.body;
			const data = await roomService.updateRoomById({
				tags,
				note,
				botUserId,
				name,
				phoneNumber,
				address,
				roomId,
				nlpEngine,
			});
			return ResponseSuccess(Constants.SUCCESS.UPDATE_ROOM_SUCCESS, data, res);
		} catch (error) {
			next(error);
		}
	}

	async stopBot(req, res, next) {
		try {
			const roomId = req.params.id;
			const nlpEngine = req.nlpEngine._id;
			await roomService.stopBot(roomId, nlpEngine);
			return ResponseSuccess(Constants.SUCCESS.STOP_BOT, null, res);
		} catch (error) {
			next(error);
		}
	}

	async startBot(req, res, next) {
		try {
			const roomId = req.params.id;
			const nlpEngine = req.nlpEngine._id;
			await roomService.startBot(roomId, nlpEngine);
			return ResponseSuccess(Constants.SUCCESS.START_BOT, null, res);
		} catch (error) {
			next(error);
		}
	}

	async countUnassignedRooms(req, res, next) {
		try {
			const nlpEngine = req.nlpEngine._id;
			const count = await roomService.countUnassignedRooms(nlpEngine);
			return ResponseSuccess(Constants.SUCCESS.COUNT_ROOMS, count, res);
		} catch (error) {
			next(error);
		}
	}
}

module.exports = new RoomController();

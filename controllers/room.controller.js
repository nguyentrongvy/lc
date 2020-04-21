const { ResponseSuccess } = require('../helpers/response.helper');
const Constants = require('../common/constants');
const roomService = require('../services/room.service');

class RoomController {
	async getUnassignedRooms(req, res, next) {
		try {
			const { lastRoom } = req.query;
			const rooms = await roomService.getUnassignedRooms(lastRoom);
			return ResponseSuccess(Constants.SUCCESS.GET_ROOMS, rooms, res);
		} catch (error) {
			next(error);
		}
	}

	async getAssignedRooms(req, res, next) {
		try {
			try {
				const agentId = req.user._id;
				const { lastRoom } = req.query;
				const rooms = await roomService.getAssignedRooms({ lastRoom, agentId });
				return ResponseSuccess(Constants.SUCCESS.GET_ROOMS, rooms, res);
			} catch (error) {
				next(error);
			}
		} catch (error) {
			next(error);
		}
	}

	async getOwnRooms(req, res, next) {
		try {
			const agentId = req.user._id;
			const { lastRoom } = req.query;
			const rooms = await roomService.getOwnRooms({ lastRoom, agentId });
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
			const room = await roomService.joinRoom({
				roomID,
				agentID,
				nlpEngine,
			});
			return ResponseSuccess(Constants.SUCCESS.JOIN_ROOM, room, res);
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
			const room = await roomService.joinRoom({
				roomID,
				agentID,
				nlpEngine,
				adminID,
			});
			return ResponseSuccess(Constants.SUCCESS.JOIN_ROOM, room, res);
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
}

module.exports = new RoomController();
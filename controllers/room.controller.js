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
}

module.exports = new RoomController();

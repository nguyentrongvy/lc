const roomService = require('../services/room.service');
const { ResponseSuccess, ResponseError } = require('../helpers/response.helper');

class RoomControlelr {
    async joinRoom(req, res, next) {
        try {
            const roomID = req.params.roomID;
            const agentID = req.user._id;
            const { channel, nlpEngine, botUser } = req.body;
            const result = await roomService.joinRoom({ roomID, agentID, channel, nlpEngine, botUser });
            if (result.exist) {
                return ResponseError('EXISTED_AGENT_THIS_ROOM', res);
            }
            return ResponseSuccess('JOIN_ROOM_SUCCESS', result.agent, res);
        } catch (error) {
            console.error(error);
        }
    }

    async assignAgentToRoom(req, res, next) {
        const roomID = req.params.roomID;
        const { agentID, channel, nlpEngine, botUser, adminID } = req.body;
        const result = await roomService.joinRoom({ roomID, agentID, channel, nlpEngine, botUser, adminID });
        if (result.exist) {
            return ResponseError('EXISTED_AGENT_THIS_ROOM', res);
        }
        return ResponseSuccess('JOIN_ROOM_SUCCESS', result.agent, res);
    }


    async leftRoom(req, res, next) {
        try {
            const roomID = req.params.roomID;
            const { agentID, channel, nlpEngine, botUser } = req.body;
            await roomService.leftRoom({ roomID, agentID, channel, nlpEngine, botUser });

            return ResponseSuccess('LEFT_ROOM_SUCCESS', null, res);
        } catch (error) {
            console.error(error);
        }
    }
}

module.exports = new RoomControlelr();
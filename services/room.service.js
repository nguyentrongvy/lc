const { messageRepository, roomRepository } = require('../repositories/index');
const messageService = require('../services/message.service');
const axios = require('axios');
const Constants = require('../common/constants');

class RoomService {
    async joinRoom({ roomID, agentID, channel, nlpEngine, botUser, adminID }) {
        const options = {
            _id: roomID,
            fields: 'agent',
        };
        const room = await roomRepository.getOne(options);
        if (!room) throw new Error('NOT_EXIST_ROOM');

        if (room.agent && room.agent.length != 0) return { exist: true, agent: room.agent };

        // join room
        await roomRepository.updateOne({
            where: {
                _id: roomID,
            },
            data: {
                agent: [agentID],
            },
        });

        //TODO: create message.
        const userName = await getUser(agentID);
        let content;
        if (!adminID) {
            content = `${userName} has joined this room.`;
        } else {
            const userNameAdmin = await getUser(adminID);
            content = `${userNameAdmin} has assigned ${userName} to this room.`;
        }
        const action = Constants.ACTION.JOIN_ROOM;
        await messageService.create({ botUser, nlpEngine, roomID, content, channel, action });

        return { exist: false, agent: [agentID] };
    }

    async leftRoom({ roomID, agentID, channel, nlpEngine, botUser }) {
        const options = {
            where: {
                _id: roomID,
            },
            data: {
                agent: [],
            },
        };
        await roomRepository.updateOne(options);

        //TODO: create message.
        const userName = await getUser(agentID);
        const action = Constants.ACTION.LEFT_ROOM;
        const content = `${userName} has left this room.`;
        await messageService.create({ botUser, nlpEngine, roomID, content, channel, action });
    }
}

async function getUser(agentID) {
    const url = `${process.env.AUTH_SERVER}/users/${agentID}`;
    const res = await axios.get(url, {
        headers: { authorization: process.env.SERVER_API_KEY }
    });

    return res.data.data.name;
}

module.exports = new RoomService();
const { messageRepository, roomRepository } = require('../repositories/index');
const Constants = require('../common/constants');

class MessageService {
    async sendMessage(botUser, nlpEngine, content, channel) {
        const room = await createRoom(botUser, nlpEngine);
        const roomID = room._id;
        const message = await this.create({ botUser, nlpEngine, roomID, content, channel });

        const unreadMessages = (room.unreadMessages || 0) + 1;
        return await roomRepository.updateOne({
            where: {
                _id: room._id,
            },
            data: {
                unreadMessages: unreadMessages,
                lastMessage: message._id,
            },
        });
    }

    async create({ botUser, nlpEngine, roomID, content, channel, action }) {
        return await messageRepository.create({
            botUser: botUser,
            nlpEngine: nlpEngine,
            room: roomID,
            content: content,
            channel: channel,
            action: (action ? action : Constants.ACTION.CHAT),
        });
    }

    async getMessagesByRoomID({ channel, search, page, length, roomID }) {
        if (!length) length = 2;
        if (!page) page = 1;
        const condition = {
            room: roomID,
        }
        if (search) {
            condition.content = new RegExp(search, 'gi');
        }
        const sortCondition = {
            createdAt: -1,
        };
        const [recordsTotal, messages] = await Promise.all([
            messageRepository.count(condition),
            messageRepository.getAll({
                limit: parseInt(length),
                page: parseInt(page),
                where: condition,
                sort: sortCondition,
            })
        ]);

        return { recordsTotal, messages };
    }
}

async function createRoom(botUser, nlpEngine) {
    const options = {
        where: {
            "botUser._id": botUser,
            "nlpEngine": nlpEngine,
        },
        options: {
            upsert: true,
        },
        data: {},
        fields: '_id',
    };

    return await roomRepository.getOneAndUpdate(options);
}

module.exports = new MessageService();
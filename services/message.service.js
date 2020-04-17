const { messageRepository, roomRepository } = require('../repositories/index');

class MessageService {
    async sendMessage(data) {
        const options = {
            where: {
                "botUser._id": data.botUser,
                "bot": data.bot,
            },
            options: {
                upsert: true,
            },
            data: {},
            fields: '_id',
        };

        const room = await roomRepository.getOneAndUpdate(options);
        return await messageRepository.create({
            botUser: data.botUser,
            bot: data.bot,
            room: room._id,
            content: data.text,
            channel: data.channel,
        });
    }
}

module.exports = new MessageService();
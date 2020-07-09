const BaseRepository = require('./base.repository');
const { loadModels } = require('../models');

loadModels();

module.exports = {
	tagRepository: new BaseRepository('Tag'),
	messageRepository: new BaseRepository('Message'),
	roomRepository: new BaseRepository('Room'),
	notificationRepository: new BaseRepository('Notification'),
	broadcastMessageRepository: new BaseRepository('BroadcastMessage'),
};

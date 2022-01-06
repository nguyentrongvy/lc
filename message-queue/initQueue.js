const Queue = require('./queue');
const { QUEUE_NAMES } = require('../common/queue');

// init queues
const getUsersQueue = new Queue(QUEUE_NAMES.GET_USERS, 5);
const broadcastMessageQueue = new Queue(QUEUE_NAMES.BROADCAST_MESSAGE, 5);

module.exports = {
    getUsersQueue,
    broadcastMessageQueue,
};
const { broadcastMessageQueue, getUsersQueue } = require('./initQueue');

const { handleBroadcastMessage, getUsers } = require('./handler-broadcast-message/processing-user');

function setupQueue() {
    getUsersQueue.addConsumer(getUsers);
    broadcastMessageQueue.addConsumer(handleBroadcastMessage);
}

module.exports = {
    setupQueue,
};
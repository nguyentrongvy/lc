const roomTimerQueue = require('./room/idle-room');

exports.cleanup = () => {
    return Promise.all([
        roomTimerQueue.clean(0, 'active'),
        roomTimerQueue.clean(0, 'waiting'),
        roomTimerQueue.clean(0, 'delayed'),
        roomTimerQueue.clean(0, 'failed'),
        roomTimerQueue.clean(0, 'completed'),
    ]).then(() => {
        roomTimerQueue.close();
    });
};

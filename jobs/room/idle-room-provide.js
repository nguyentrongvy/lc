const roomTimerQueue = require('./idle-room');
const Constants = require('../../common/constants');

exports.addJob = (data) => {
    return roomTimerQueue.add(Constants.JOBS.IdleRoom, data, {
        backOff: 5,
        removeOnComplete: true,
        delay: 3 * 60 * 1000,
    });
};

exports.getJob = (jobId) => {
    return roomTimerQueue.getJob(jobId);
}
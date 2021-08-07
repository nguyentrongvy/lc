const _ = require('lodash');
const roomTimerQueue = require('./idle-room');
const Constants = require('../../common/constants');
const {
    getDataFromRedis,
} = require('../../services/redis.service');

exports.addJob = async (data) => {
    const expiredTime = _.toNumber(await getDataFromRedis(`${Constants.REDIS.PREFIX.ROOM_COUNTDOWN}:${data.engineId}`)) || -1;
    if (expiredTime == -1) return;
    return roomTimerQueue.add(Constants.JOBS.IdleRoom, data, {
        backOff: 5,
        removeOnComplete: true,
        delay: expiredTime * 1000,
    });
};

exports.getJob = (jobId) => {
    return roomTimerQueue.getJob(jobId);
}
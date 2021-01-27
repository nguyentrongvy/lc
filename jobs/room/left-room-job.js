const Constants = require('../../common/constants');
const {
    setToRedis,
    getFromRedis,
    delFromRedis,
} = require('../../services/redis.service');
const roomTimerProvider = require('./idle-room-provide');
const expiredTime = 3 * 60;
exports.addProcessJobs = async (roomId, engineId) => {
    const jobRoomTimer = await roomTimerProvider.addJob({
        roomId,
        engineId,
    });

    await setToRedis(`LeftRoomJob-${roomId}`, jobRoomTimer.id, 'EX', expiredTime);

};

exports.removeJob = async (roomId) => {
    const jobId = await getFromRedis(`LeftRoomJob-${roomId}`);
    if (jobId) {
        roomTimerProvider.getJob(jobId).then((job) => {
            job.remove();
        });
    }
    await delFromRedis(`LeftRoomJob-${roomId}`);
}

exports.handleLeftRoomJob = async (roomId, engineId) => {
    const hadJobQueue = await getFromRedis(`LeftRoomJob-${roomId}`);
    if (!hadJobQueue) {
        this.addProcessJobs(roomId, engineId);
    } else {
        this.removeJob(roomId);
        this.addProcessJobs(roomId, engineId);
    }
}
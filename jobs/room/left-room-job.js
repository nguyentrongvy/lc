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

exports.replaceJob = async (jobId, roomId, engineId) => {
    roomTimerProvider.getJob(jobId).then((job) => {
        job.remove();
    });

    this.addProcessJobs(roomId, engineId);
}

exports.handleLeftRoomJob = async (roomId, engineId) => {
    const hadJobQueue = await getFromRedis(`LeftRoomJob-${roomId}`);
    if (!hadJobQueue) {
        this.addProcessJobs(roomId, engineId);
    } else {
        await delFromRedis(`LeftRoomJob-${roomId}`);
        this.replaceJob(hadJobQueue, roomId, engineId);
    }
}
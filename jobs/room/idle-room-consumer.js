const Constants = require('../../common/constants');
const roomTimerQueue = require('./idle-room');
const roomService = require('../../services/room.service');
const {
    delFromRedis,
} = require('../../services/redis.service');

const CONCURRENCY = {
    DELAY: 500,
};

exports.addProcessJobs = () => {
    async function handleLeftRoom(job, done) {
        try {
            const roomID = job.data && job.data.roomId;
            const engineId = job.data && job.data.engineId;
            await roomService.emptyRoom({ roomID, engineId });
            await delFromRedis(`LeftRoomJob-${roomID}`);
            
            done();
        } catch (error) {
            done(error);
        }
    };

    roomTimerQueue.process(Constants.JOBS.IdleRoom, CONCURRENCY.DELAY, handleLeftRoom);
};
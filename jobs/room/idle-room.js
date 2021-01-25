const Queue = require('bull');
const roomTimerQueue = new Queue('room-timer', process.env.REDIS_HOST);
const logger = require('../../services/logger');

roomTimerQueue.on('completed', (job, result) => {
  logger.info(`Left room ${job.id} sent successfully`);
});

roomTimerQueue.on('error', (error) => {
  error.message = `Left_room_job: ${error.message}`;
  logger.error(error);
});

module.exports = roomTimerQueue;

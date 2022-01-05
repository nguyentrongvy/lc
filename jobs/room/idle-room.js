const Queue = require('bull');
const { QUEUE_REDIS_OPTIONS } = require('../../common/redis-options');
const roomTimerQueue = new Queue('room-timer', QUEUE_REDIS_OPTIONS);
const logger = require('../../services/logger');

roomTimerQueue.on('completed', (job, result) => {
  logger.info(`Left room ${job.id} sent successfully`);
});

roomTimerQueue.on('error', (error) => {
  error.message = `Left_room_job: ${error.message}`;
  logger.error(error);
});

module.exports = roomTimerQueue;

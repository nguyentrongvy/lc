const Queue = require('bull');

const logger = require('../services/logger');
const { QUEUE_REDIS_OPTIONS } = require('../common/redis-options');

const BACK_OFF = {
    type: "exponential",
    delay: 1000,
};

class MyQueue {
    constructor(name, concurrency, redisOption = QUEUE_REDIS_OPTIONS) {
        this.name = name;
        this.concurrency = concurrency;
        if (typeof redisOption === 'string') {
            this.queue = new Queue(this.name, redisOption, {
                settings: {
                    stalledInterval: 600000,
                },
            });
        } else {
            this.queue = new Queue(this.name, redisOption);
        }

        this.initEvent();
    }

    getQueue() {
        return this.queue;
    }

    provide(data, options = {}) {
        return this.queue.add(data, {
            backOff: BACK_OFF,
            removeOnComplete: true,
            ...options,
        });
    }

    addConsumer(handler) {
        return this.queue.process(
            this.concurrency,
            handler,
        );
    }

    async removeJob(jobId) {
        const job = await this.queue.getJob(jobId);
        if (job) {
            return job.remove();
        }
    }

    initEvent() {
        this.queue.on('completed', (job, _) => {
            logger.info(`INFO: ${this.name.toUpperCase()}: ${job.id} sent successfully`);
        });

        this.queue.on('error', (error) => {
            error.message = `ERROR: ${this.name.toUpperCase()}: ${error.message}`;
            logger.error(error);
        });
    }
}

module.exports = MyQueue;

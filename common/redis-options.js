function getRedisOptions() {
    if (process.env.REDIS_HOST) return process.env.REDIS_HOST;

    return {
        port: process.env.REDIS_PORT,
        host: process.env.REDIS_HOST_NAME,
        password: process.env.REDIS_PASSWORD,
        tls: {
            servername: process.env.REDIS_HOST_NAME,
        },
    };
}

function getQueueRedisOptions() {
    if (process.env.REDIS_HOST) return process.env.REDIS_HOST;

    return {
        redis: getRedisOptions(),
    };
}

module.exports = {
    REDIS_OPTIONS: getRedisOptions(),
    QUEUE_REDIS_OPTIONS: getQueueRedisOptions(),
}
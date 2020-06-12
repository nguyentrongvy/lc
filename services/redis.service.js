const redis = require('redis');
const client = redis.createClient(process.env.REDIS_HOST);
const { promisify } = require('util');

const Constants = require('../common/constants');

const getFromRedis = promisify(client.get).bind(client);
const setToRedis = promisify(client.set).bind(client);
const setExToRedis = promisify(client.setex).bind(client);
const delFromRedis = promisify(client.del).bind(client);

const hmGetFromRedis = promisify(client.hmget).bind(client);
const hmSetToRedis = promisify(client.hmset).bind(client);
const hGetAllFromRedis = promisify(client.hgetall).bind(client);

const notifyExpiredKey = callback => {
    client.send_command(
        'config',
        ['set', 'notify-keyspace-events', 'Ex'],
        subscribeExpired
    );

    function subscribeExpired(e, r) {
        const sub = redis.createClient(process.env.REDIS_HOST);
        const expiredSubKey = '__keyevent@0__:expired';
        sub.subscribe(expiredSubKey, function () {
            sub.on('message', async function (_chan, key) {
                callback(key);
            });
        });
    }
};

const getTtlRedis = keys => {
    return new Promise((resolve, reject) => {
        const multi = client.multi();
        keys.forEach(key => multi.ttl(key));
        multi.exec((error, ttls) => {
            if (error) {
                return reject(error);
            }
            resolve(ttls);
        });
    });
};

const getMultiKey = keys => {
    return new Promise((resolve, reject) => {
        const multi = client.multi();
        keys.forEach(key => multi.get(key));
        multi.exec((error, data) => {
            if (error) {
                return reject(error);
            }
            resolve(data);
        });
    });
};

const publishStopBot = (botId, botUserId, status) => {
    const data = {
        botId,
        botUserId,
        status,
    };
    return new Promise((resolve, reject) => {
        client.publish(Constants.REDIS.CHANNEL.STOP_BOT, JSON.stringify(data), (err) => {
            if (err) {
                return reject(err);
            }

            return resolve(true);
        });
    });
};

module.exports = {
    client,
    getFromRedis,
    setToRedis,
    setExToRedis,
    delFromRedis,
    hmSetToRedis,
    hmGetFromRedis,
    hGetAllFromRedis,
    getTtlRedis,
    getMultiKey,
    notifyExpiredKey,
    publishStopBot,
};

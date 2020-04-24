const redis = require('redis');
const client = redis.createClient();
const { promisify } = require('util');
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
        const sub = redis.createClient();
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
}

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
    notifyExpiredKey,
};

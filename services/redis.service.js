const redis = require('redis');
const client = redis.createClient();
const { promisify } = require('util');
const getFromRedis = promisify(client.get).bind(client);
const setToRedis = promisify(client.set).bind(client);

const hmGetFromRedis = promisify(client.hmget).bind(client);
const hmSetToRedis = promisify(client.hmset).bind(client);
const hGetAllFromRedis = promisify(client.hgetall).bind(client);

module.exports = {
    client,
    getFromRedis,
    setToRedis,
    hmGetFromRedis,
    hmSetToRedis,
    hGetAllFromRedis,
};

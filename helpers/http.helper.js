const axios = require('axios');

const Constants = require('../common/constants');

class HttpHelper {
    static async get(url, headers, options) {
        const res = await send(url, 'GET', headers, '', options);
        return res;
    }

    static async post(url, body, headers) {
        const res = await send(url, 'POST', headers, body);
        return res;
    }

    static async put(url, body, headers) {
        const res = await send(url, 'PUT', headers, body);
        return res;
    }

    static async delete(url, headers) {
        const res = await send(url, 'DELETE', headers);
        return res;
    }

    static async send(url, method, headers, body) {
        const res = await send(url, method, headers, body);
        return res;
    }
}

module.exports = HttpHelper;

async function send(url, method, headers, body, options) {
    headers = initAuthorizationHeaders(headers);
    const newOptions = {
        url,
        method,
        headers,
        data: body,
        timeout: (options && options.timeout) || Constants.DEFAULT_TIMEOUT,
    };

    const res = await axios(newOptions);

    return res && res.data;
}

function initAuthorizationHeaders(headers) {
    if (headers) {
        headers.authorization = process.env.SERVER_API_KEY;
    } else {
        headers = {
            authorization: process.env.SERVER_API_KEY
        }
    }
    return headers;
}
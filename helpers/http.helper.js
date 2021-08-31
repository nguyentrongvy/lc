const axios = require('axios');

class HttpHelper {
    static async get(url, headers) {
        const res = await send(url, 'GET', headers);
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

async function send(url, method, headers, body) {
    headers = initAuthorizationHeaders(headers);
    const options = {
        url,
        method,
        headers,
        data: body,
    };

    const res = await axios(options);

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
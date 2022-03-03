const axios = require('axios');
const _ = require('lodash');
const Constants = require('../common/constants');
const tracer = require('../helpers/tracing.helper').getGlobalTracer();
const openTracing = require('opentracing');

class HttpHelper {
    static async get(url, headers, options) {
        const res = await send(url, 'GET', headers, undefined, options);
        return res;
    }

    static async post(url, body, headers, options) {
        const res = await send(url, 'POST', headers, body, options);
        return res;
    }

    static async put(url, body, headers, options) {
        const res = await send(url, 'PUT', headers, body, options);
        return res;
    }

    static async delete(url, headers, options) {
        const res = await send(url, 'DELETE', headers, undefined, options);
        return res;
    }

    static async send(url, method, headers, body, options) {
        const res = await send(url, method, headers, body, options);
        return res;
    }
}

module.exports = HttpHelper;

async function send(url, method, headers, body, options) {
    const span = _.get(options, 'span');
    headers = initAuthorizationHeaders(headers);
    if (span) {
        tracer.inject(span, openTracing.FORMAT_HTTP_HEADERS, headers);
    }
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
const _ = require('lodash');
const cookie = require("cookie");
const logger = require('../services/logger');
const httpHelper = require('./http.helper');
const { APP_NAME, COOKIE_NAME, ENV } = require('../common/constants');

class TokenHelper {
    getTokenFromRequest(req) {
        if (req.headers.authorization) return req.headers.authorization;

        const appName = req.headers['app-name'];
        if (!appName) return;

        const cookieName = getCookieName(appName);
        if (!cookieName) return;

        const token = req.cookies[cookieName];
        if (!token) return;

        return `Bearer ${token}`;
    }

    getTokenFromSocket(socket) {
        const token = _.get(socket, 'handshake.query.token');
        if (token) return token;

        const cookies = cookie.parse(_.get(socket, 'handshake.headers.cookie', ''));
        if (!cookies) return;

        const appName = _.get(socket, 'handshake.query.appName');
        if (!appName) return;

        const cookieName = getCookieName(appName);
        if (!cookieName) return;

        return cookies[cookieName];
    }

    async verifyToken(token, userAgent, appName, origin) {
        try {
            if (!token) return;

            const res = await httpHelper.post(`${process.env.AUTH_SERVER}/auth/token/verify`, { token }, {
                origin,
                'user-agent': userAgent,
                'app-name': appName,
            });
            return res && res.data;
        } catch (err) {
            logger.error(err);
        }
    }
}

function getCookieName(appName) {
    if (!appName) return;

    const name = getCookieNameByAppName(appName);
    if (!name) return;

    const env = getEnv();
    if (!env) return;

    return `_${name}_${env}_`;
}

function getCookieNameByAppName(appName) {
    if (!appName) return;

    switch (appName) {
        case APP_NAME.Admin: return COOKIE_NAME.Admin;
        case APP_NAME.VirtualAgent: return COOKIE_NAME.VirtualAgent;
        case APP_NAME.VirtualQC: return COOKIE_NAME.VirtualQC;
        case APP_NAME.LiveChat: return COOKIE_NAME.LiveChat;
        case APP_NAME.Labelbox: return COOKIE_NAME.Labelbox;
    }
}

function getEnv() {
    const env = process.env.ENV;
    if (!env) return;

    switch (env) {
        case ENV.Local: return 'l';
        case ENV.Dev: return 'd';
        case ENV.Test: return 't';
        case ENV.Stag: return 's';
        case ENV.Prod: return 'p';
    }
}

module.exports = new TokenHelper();
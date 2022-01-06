const axios = require('axios');
const queryString = require('query-string');

const { getUsersQueue, broadcastMessageQueue } = require('../message-queue/initQueue');
const Constants = require('../common/constants');
const httpHelper = require('../helpers/http.helper');

exports.processingScheduleTime = async ({ message, responses, engineId, sentUsers, tag }) => {
    if (message.scheduleTime) {
        const request = {
            url: `${process.env.LIVE_CHAT_SERVER}/v1/messages/broadcast/schedule`,
            method: 'POST',
            data: {
                message,
                responses,
                engineId,
                sentUsers,
                tag,
            },
            headers: { authorization: process.env.SERVER_API_KEY },
            timeout: Constants.TIMEOUT.CREATE_JOB,
        };

        const apiUrl = `${process.env.SCHEDULER_SERVER}/api/v1/schedule`;
        const key = `${engineId}:${message.name}`;

        const headers = {
            authorization: process.env.SERVER_API_KEY,
        };

        await httpHelper.post(apiUrl, {
            request,
            name: key,
            date: message.scheduleTime,
        }, headers);
    } else {
        await getUsersQueue.provide({ message, responses, engineId, sentUsers, tag });
    }
}

exports.getUsers = async ({ engineId, message, tag, responses }) => {
    let lastId;
    while (true) {
        const users = await this.getUsersByEngineId({
            engineId,
            lastId,
            gender: message.gender,
            pageId: message.pageId,
            channel: message.channel,
            lastActiveDate: message.lastActiveDate,
        });
        if (!users || users.length === 0) {
            break;
        }

        lastId = users[users.length - 1]._id;

        await broadcastMessageQueue.provide({
            users,
            tag,
            message,
            engineId,
            responses,
            pageId: message.pageId,
        });
        if (users.length < 100) {
            break;
        }
    }
}

exports.getUsersByEngineId = async ({ engineId, channel, lastActiveDate, gender, pageId, lastId }) => {
    let url = `${process.env.NLP_SERVER}/v1/bot-users/bot`;
    const fields = '_id';
    const sort = '_id';

    const params = {
        lastId,
        sort,
        fields,
        gender,
        pageId,
        channel,
        lastActiveDate,
    };

    const stringified = queryString.stringify(params);

    if (channel) {
        url += `?${stringified}`;
    }
    const headers = {
        authorization: process.env.SERVER_API_KEY,
        engineid: engineId,
    };

    return httpHelper.get(url, headers);
}

exports.getUsersById = async ({ options, engineId }) => {
    const url = `${process.env.NLP_SERVER}/v1/bot-users/bot?options=${options}`;
    const headers = {
        authorization: process.env.SERVER_API_KEY,
        engineid: engineId,
    };

    const tempOptions = {
        timeout: Constants.DEFAULT_TIMEOUT,
    };

    return httpHelper.get(url, headers, tempOptions);
}

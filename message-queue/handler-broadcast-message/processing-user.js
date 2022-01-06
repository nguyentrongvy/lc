const _ = require('lodash');

const logger = require('../../services/logger');
const Constants = require('../../common/constants');
const broadcastResponseService = require('../../services/broadcast-response.service');
const roomService = require('../../services/room.service');
const messageService = require('../../services/message.service');
const { getFromRedis } = require('../../services/redis.service');
const { getUsers, getUsersById } = require('../../services/helpers');

exports.handleBroadcastMessage = async (job, done) => {
    try {
        const {
            responses,
            message,
            users,
            tag,
            engineId,
        } = job.data;

        const ids = users.map(({ _id }) => ({ _id }));
        let options = {
            _id: ids,
        };
        options = JSON.stringify(options);
        const sentUsers = await getUsersById({ engineId, options });

        await handleMessage({ message, responses, engineId, sentUsers, tag });
        done();
    } catch (error) {
        logger.error(error);
        done(error);
    }
}

exports.getUsers = async (job, done) => {
    try {
        const {
            tag,
            message,
            engineId,
            responses,
        } = job.data;

        await getUsers({
            tag,
            message,
            engineId,
            responses,
        });
        done();
    } catch (error) {
        logger.error(error);
        done(error);
    }
}

async function handleMessage({ message, responses, engineId, sentUsers, tag }) {
    const message_type = _.get(message, 'message_type', Constants.BROADCAST_MESSAGE_TYPE.BROADCAST);
    const messageType = {
        message_type,
        tag,
    };

    const promise = sentUsers.map(user => sendMessage({ user, responses, engineId, messageType }));
    await Promise.all(promise);
}

async function sendMessage({ user, responses, engineId, messageType }) {
    let sessionInfo;
    if (user.sessionId) {
        const parameterString = await getFromRedis(user.sessionId);
        if (parameterString) sessionInfo = JSON.stringify(parameterString);
    };
    const redisInfo = {
        userInfo: sessionInfo && sessionInfo.userInfo || { name: user.name, phoneNumber: user.phoneNumber },
        queryResult: sessionInfo && sessionInfo.queryResult,
    };
    const allParameters = sessionInfo && sessionInfo.allParameters;
    const replacedResponses = responses.map(r => {
        if (r.text && r.text.length > 0) r.text = broadcastResponseService.getRandomResponseText(r.text, allParameters, redisInfo);
        return r;
    });
    const room = await roomService.getRoomByUserId(engineId, user._id);
    if (!room) {
        user.isSent = false;
        return;
    };

    user.isSent = true;
    return messageService.sendMessageAuto({
        suggestions: {
            pageId: room.pageId,
            responses: [
                {
                    channelResponses: replacedResponses,
                },
            ],
            messageType,
        },
        roomId: room._id,
        engineId,
        isProactiveMessage: true,
    });
}
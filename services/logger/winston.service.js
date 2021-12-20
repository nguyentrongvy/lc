const { createLogger, format, transports } = require('winston');
const WinstonCloudWatch = require('winston-cloudwatch');
const path = require('path');

const awsHelper = require('../../helpers/aws.helper');

const configLog = {
    level: 'info',
    format: format.combine(
        format.timestamp({
            format: 'YYYY-MM-DD HH:mm:ss',
        }),
        format.errors({ stack: true }),
        format.splat(),
        format.json(),
        format.printf(info => info)
    ),
    defaultMeta: { service: process.env.SERVICE_NAME },
    transports: [],
};

// Create logger
const loggerCommon = createLogger({
    ...configLog,
    transports: [
        new transports.Console({
            format: format.combine(
                format.colorize(),
                format.timestamp({
                    format: 'YY-MM-DD HH:MM:SS',
                }),
                format.printf((info) => `${info.timestamp} ${info.level} : ${JSON.stringify(info.message, null, 0)}`)
            ),
            level: 'info',
        }),
    ],
});
loggerCommon.stream = {
    write: message => {
        loggerCommon.info(message.substring(0, message.lastIndexOf('\n')));
    },
};

const loggerErrorConsole = createLogger({
    ...configLog,
    transports: [
        new transports.Console({
            format: format.combine(
                format.colorize(),
                format.timestamp({
                    format: 'YY-MM-DD HH:MM:SS',
                }),
                format.printf((info) => `${info.timestamp} ${info.level} : ${JSON.stringify(info.message, null, 0)}`)
            ),
            level: 'error',
        }),
    ],
});

// format stream
loggerCommon.stream = {
    write: message => {
        let msg = message;
        try {
            msg = JSON.parse(msg);
        } catch (error) { }
        loggerCommon.info(msg);
    },

};
loggerErrorConsole.stream = {
    write: message => {
        let msg = message;
        try {
            msg = JSON.parse(msg);
        } catch (error) { }
        loggerErrorConsole.error(msg);
    },
};

// register external log dest
const formatMessage = log => {
    let { message, level, meta, timestamp, service } = log;
    let data = {
        level,
        meta,
        timestamp,
        service,
    };

    if (typeof message == 'object') {
        data = Object.assign(data, {
            ...message,
        });
    } else {
        data.message = message;
    }
    return JSON.stringify(data, null, 0);
};

if (
    process.env.LOGGING_EXTERNAL == 'cloudwatch'
    && (
        process.env.ENV == 'prod'
        || process.env.ENV == 'staging'
    )
) {
    loggerCommon.add(new WinstonCloudWatch({
        name: 'common-stream',
        cloudWatchLogs: awsHelper.getCloudWatch(),
        logGroupName: process.env.ENV,
        logStreamName: process.env.LOGGING_STREAM,
        awsRegion: process.env.REGION,
        retentionInDays: process.env.LOGGING_RETENTION_DAYS,
        level: 'info',
        messageFormatter: formatMessage,
    }));
    loggerErrorConsole.add(new WinstonCloudWatch({
        name: 'error-stream',
        cloudWatchLogs: awsHelper.getCloudWatch(),
        logGroupName: process.env.ENV,
        logStreamName: process.env.LOGGING_STREAM,
        awsRegion: process.env.REGION,
        retentionInDays: process.env.LOGGING_RETENTION_DAYS,
        level: 'error',
        messageFormatter: formatMessage,
    }));
}

module.exports = {
    loggerCommon,
    loggerErrorConsole,
};

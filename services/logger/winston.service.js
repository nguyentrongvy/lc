const { createLogger, format, transports } = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');

const path = require('path');

const configLog = {
    level: 'info',
    format: format.combine(
        format.timestamp({
            format: 'YYYY-MM-DD HH:mm:ss'
        }),
        format.errors({ stack: true }),
        format.splat(),
        format.json(),
        format.printf(info => `${info.timestamp} ${info.level}: ${info.message} ${info.stack || ''}`)
    ),
    defaultMeta: { service: 'nlp-server' },
    transports: [],
};

const loggerCommon = createLogger({
    ...configLog,
    transports: [
        new DailyRotateFile({
            filename: path.resolve('../logs', 'combined-%DATE%.log'),
            datePattern: 'YYYY-MM-DD',
        }),
        new transports.Console({
            format: format.combine(
                format.colorize(),
                format.simple()
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
                format.simple()
            ),
            level: 'error',
        }),
        new DailyRotateFile({
            filename: path.resolve('../logs', 'error-%DATE%.log'),
            level: 'error',
            datePattern: 'YYYY-MM-DD',
        }),
    ],
});
loggerErrorConsole.stream = {
    write: message => {
        loggerErrorConsole.error(message.substring(0, message.lastIndexOf('\n')))
    },
};

module.exports = {
    loggerCommon,
    loggerErrorConsole,
};

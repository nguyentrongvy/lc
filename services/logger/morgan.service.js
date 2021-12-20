const morgan = require('morgan');
const {
    loggerCommon,
    loggerErrorConsole,
} = require('./winston.service');

morgan.token('engine', function (req) { return req.headers['engineid']});
const configMorgan = (tokens, req, res) => {
    return JSON.stringify({
        engine: tokens.engine(req, res),
        method: tokens.method(req, res),
        url: tokens.url(req, res),
        status: tokens.status(req, res),
        'content-length': tokens.res(req, res, 'content-length'),
        'response-time': tokens['response-time'](req, res) + 'ms',
        'user-agent': tokens['user-agent'],
    }, null, 0);
};

module.exports = {
    common: morgan(
        configMorgan,
        {
            stream: loggerCommon.stream,
        },
    ),
    error: morgan(
        configMorgan,
        {
            stream: loggerErrorConsole.stream,
            skip: function (req, res) {
                return res.statusCode < 400;
            },
        },
    ),
    dev: morgan('dev'),
};

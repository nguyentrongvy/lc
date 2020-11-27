const morgan = require('morgan');
const {
    loggerCommon,
    loggerErrorConsole,
} = require('./winston.service');

morgan.token('engine', function (req) { return req.headers['engineid'] });
const configMorgan = ':remote-addr ENGINE-:engine :method :url :status :response-time ms - :res[content-length] :user-agent';

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

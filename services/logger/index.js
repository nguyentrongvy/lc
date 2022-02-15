const env = process.env.ENV || 'dev';
const logSlack = require('./slack')(env);
const {
	loggerErrorConsole: logWinstonError,
	loggerCommon: logWinstonInfo,
} = require('./winston.service');
const Constants = require('../../common/constants');

exports.error = (err, req) => {
	switch (env) {
		case 'test':
		case 'staging':
		case 'prod': {
			logSlack.error(err);
			let info = {};
			let error;
			if (typeof err === Constants.TYPE.String) {
				error = err;
			} else {
				error = Object.assign({}, err);
			}
			if (req) {
				info = {
					engineId: req.headers && req.headers.engineId,
					method: req.method,
					url: req.originalUrl,
				};
			}
			if (err instanceof Error) {
				error.message = {
					...info,
					error: err.message,
					stack: JSON.stringify(err.stack),
				};
			}
			logWinstonError.error(error);
			return;
		}
		default: {
			console.error(err);
			return;
		}
	}
};

exports.info = (msg) => {
	switch (env) {
		case 'dev':
		case 'test':
		case 'staging':
		case 'prod': {
			logSlack.info(msg);
			logWinstonInfo.info(msg);
			return;
		}
		default: {
			console.log(JSON.stringify(msg, null, 0));
			return;
		}
	}
};

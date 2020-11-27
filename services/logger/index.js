const env = process.env.ENV || 'dev';
const logSlack = require('./slack')(env);
const {
	loggerErrorConsole: logWinstonError,
	loggerCommon: logWinstonInfo,
} = require('./winston.service');

exports.error = (err, req) => {
	switch (env) {
		case 'beta':
		case 'staging':
		case 'prod': {
			let info;
			if (req) {
				info = `${req.ip} ENGINE-${req.headers.engineid || '-'} ${req.method} ${req.originalUrl}`;
			}
			err.message = `${info || ''} ${err.message}`;
			logSlack.error(err);
			logWinstonError.error(err);
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
		case 'beta':
		case 'staging':
		case 'prod': {
			logSlack.info(msg);
			logWinstonInfo.info(msg);
			return;
		}
		default: {
			console.log(msg);
			return;
		}
	}
};

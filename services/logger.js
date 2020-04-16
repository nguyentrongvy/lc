const logSlack = require('./slack')(process.env.ENV);

exports.error = (err) => {
	const env = process.env.ENV || 'dev';
	switch (env) {
		case 'beta': {
			logSlack.error(err);
			return;
		}
		case 'prod': {

		}
		default: {
			console.error(err);
			return;
		}
	}
};

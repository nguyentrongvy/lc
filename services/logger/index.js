const env = process.env.ENV || 'dev';
const logSlack = require('./slack')(env);

exports.error = (err) => {
	switch (env) {
	case 'beta': 
	case 'prod': {
		logSlack.error(err);
		return;
	}
	default: {
		console.error(err);
		return;
	}
	}
};

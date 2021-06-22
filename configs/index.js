const dbSettings = require('./mongo');
const cors = require('./cors');

module.exports = {
	dbSettings,
	serverSettings: {
		cors,
		port: process.env.PORT,
	},
};

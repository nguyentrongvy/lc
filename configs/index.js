const jwt = require('./jwt');
const dbSettings = require('./mongo');
const cors = require('./cors');

module.exports = {
	dbSettings,
	serverSettings: {
		jwt,
		cors,
		port: process.env.PORT,
	},
};

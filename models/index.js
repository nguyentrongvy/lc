const mongoose = require('mongoose');

module.exports = {
	mongoose,
	connectDB: (dbSettings) => mongoose.connect(dbSettings.connection, dbSettings.options),
	loadModels: () => {
		require('./broadcast-message');
		require('./broadcast-response');
		require('./message');
		require('./notification');
		require('./room');
		require('./tag');
	},
};
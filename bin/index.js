const fs = require('fs');
const dotenv = require('dotenv');
const path = require('path');
// load process env
const projectPath = path.resolve('.');
if (fs.existsSync(path.resolve(projectPath, '../configs/.env'))) {
	dotenv.config({ path: path.resolve(projectPath, '../configs/.env') });
} else {
	dotenv.config({ path: path.resolve(projectPath, '.env') })
}

const { dbSettings, serverSettings } = require('../configs');
const models = require('../models');
const server = require('./server');
const { notifyExpiredKey } = require('../services/redis.service');
const timerResponseBot = require('../services/timer.service');
const logger = require('../services/logger');
let connectionDB;

const cleanup = (app) => () => {
	app.close(() => {
		logger.info('Closed out remaining connections.');
		models.mongoose.connection.close();
		process.exit(1);
	});
};

process.on('uncaughtException', (err) => {
	logger.error(err);
});

process.on('uncaughtRejection', (err) => {
	logger.error(err);
});

models.connectDB(dbSettings)
	.then((connection) => {
		logger.info('DB connected!');
		connectionDB = connection;
		return server.start(serverSettings);
	})
	.then((app) => {
		logger.info(`Server started succesfully, running on port: ${serverSettings.port}.`);
		app.on('close', () => {
			logger.info('Server stopped.');
			connectionDB.disconnect();
		});

		notifyExpiredKey(timerResponseBot.run);

		process.on('SIGINT', cleanup(app));
		process.on('SIGTERM', cleanup(app));
	})
	.catch((e) => {
		logger.error(e);
		process.exit(1);
	});

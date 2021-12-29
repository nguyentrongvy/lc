const express = require('express');
const cors = require('cors');
const compression = require('compression');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');

const apis = require('./apis');
const errorHanlder = require('./helpers/error-handler');
const logger = require('.//services/logger');
const httpLoggerMiddleware = require('./services/logger/morgan.service');
const initTracer = require('./helpers/tracing.helper').init;

const tracingMiddleware = require('./middlewares/tracing.middleware');

module.exports = () => {
	const app = express();


	app.use(helmet());
	app.use(compression());
	app.use(cors({ origin: getCorsOrigins(), credentials: true }));
	app.get('/health-check', (_, res) => res.json({ success: true }));

	app.use(bodyParser.urlencoded({ extended: false }));
	app.use(bodyParser.json({ type: 'application/json' }));
	app.use(cookieParser());

	if (process.env.ENV === 'dev' || process.env.ENV === 'test') {
		app.use(httpLoggerMiddleware.dev);
	} else {
		initTracer(process.env.SERVICE_NAME || 'livechat');
		app.use(tracingMiddleware);
		app.use(httpLoggerMiddleware.error);
		app.use(httpLoggerMiddleware.common);
	}

	// load static file
	app.use(express.static('public'));

	// load APIs
	apis.load(app);

	// Error handling
	app.use(errorHanlder(logger));

	return app;
};

function getCorsOrigins() {
	const origins = process.env.CORS_ORIGINS;
	if (!origins) return '*';

	return origins.split(',').map(origin => origin.trim());
}
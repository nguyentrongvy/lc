const express = require('express');
const cors = require('cors');
const compression = require('compression');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const helmet = require('helmet');

const apis = require('./apis');
const errorHanlder = require('./helpers/error-handler');
const logger = require('.//services/logger');

module.exports = (settings) => {
	const corsHeaders = settings.cors;

	const app = express();
	const ENV = process.ENV || 'dev';

	app.use(helmet());
	app.use(morgan(ENV));
	app.use(compression());
	app.use(cors(corsHeaders));
	app.options('*', cors(corsHeaders));

	app.use(bodyParser.urlencoded({ extended: false }));
	app.use(bodyParser.json({ type: 'application/json' }));

	// load static file
	app.use(express.static('public'));

	// load APIs
	apis.load(app);

	// Error handling
	app.use(errorHanlder(logger));

	return app;
};

exports.load = (app) => {
	require('./broadcast-message.api').load(app);
	require('./broadcast-response.api').load(app);
	require('./message').load(app);
	require('./notification').load(app);
	require('./room').load(app);
	require('./tag').load(app);
	require('./timer.api').load(app);
};

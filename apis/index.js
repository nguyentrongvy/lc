exports.load = (app) => {
	require('./broadcast-message.api');
	require('./broadcast-response.api');
	require('./message');
	require('./notification');
	require('./room');
	require('./tag');
	require('./timer.api');
};

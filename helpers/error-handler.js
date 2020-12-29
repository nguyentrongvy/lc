const convertError = (message) => {
	switch (message) {
		default:
			return {
				code: 400,
				message: message,
			};
	}
};

module.exports = (logger) => (err, _req, res, _next) => {
	const errMessage = err && err.message;
	logger.error(err, _req);

	if (Array.isArray(err.errors)) {
		const messages = err.errors.map((item) => item.messages);
		return res.status(400).json({
			errors: messages,
		});
	}

	const { code, message } = convertError(errMessage);
	return res.status(code).json({
		message,
	});
};

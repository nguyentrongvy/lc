const jwt = require('jsonwebtoken');
const {
	serverSettings: {
		jwt: {
			privateKey,
			publicKey,
			expiresIn,
			algorithm,
		},
	},
} = require('../configs');

exports.generateToken = (data, options = {}) => {
	options = {
		algorithm,
		expiresIn, ...options
	};
	const token = jwt.sign(data, privateKey, options);
	return token;
};

exports.verifyToken = (token, options = {}) => {
	const verifiedData = jwt.verify(token, publicKey, options);
	return verifiedData;
};

const jwt = require('jsonwebtoken');

let publicKey;
loadJwtKey();

exports.verifyToken = (token, options = {}) => {
	const verifiedData = jwt.verify(token, publicKey, options);
	return verifiedData;
};

function loadJwtKey() {
	try {
		publicKey = Buffer.from(process.env.JWT_PUBLIC_KEY, 'base64').toString('utf-8');
	} catch (err) {
		throw new Error('JWT_PUBLIC_KEY is empty!');
	}
}
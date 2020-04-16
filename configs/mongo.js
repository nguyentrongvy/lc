const options = {
	useNewUrlParser: true,
	useFindAndModify: false,
	useCreateIndex: true,
	useUnifiedTopology: true,
};

const connection = process.env.MONGO_URL || 'mongodb://localhost:27017/nodejs';

module.exports = {
	options,
	connection,
};

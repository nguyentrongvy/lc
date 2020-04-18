const { mongoose } = require('./index');
const Constants = require('../common/constants');

const messageSchema = new mongoose.Schema({
	botUser: {
		type: mongoose.SchemaTypes.ObjectId,
		ref: 'BotUser',
	},
	agent: {
		type: mongoose.SchemaTypes.ObjectId,
		ref: 'User',
	},
	channel: {
		type: String,
		enum: Object.values(Constants.CHANNEL),
		required: true,
	},
	room: {
		type: mongoose.SchemaTypes.ObjectId,
		ref: 'Room',
		required: true,
	},
	nlpEngine: {
		type: mongoose.SchemaTypes.ObjectId,
		ref: 'NlpEngine',
		required: true,
	},
	content: {
		type: String,
		max: 5000,
		required: true,
	},
	action: {
		type: String,
		enum: Object.values(Constants.ACTION),
		default: Constants.ACTION.CHAT,
	},
	deletedAt: {
		type: Date,
	},
}, { timestamps: true });

const Message = mongoose.model('Message', messageSchema);
module.exports = Message;

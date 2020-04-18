const { mongoose } = require('./index');
const Constants = require('../common/constants');

const roomSchema = new mongoose.Schema({
	botUser: {
		_id: {
			type: mongoose.SchemaTypes.ObjectId,
			ref: 'BotUser',
			required: true,
		},
		username: {
			type: String,
			max: 1000,
		},
	},
	agent: [{
		type: mongoose.SchemaTypes.ObjectId,
		ref: 'User',
	}],
	lastMessage: {
		type: mongoose.SchemaTypes.ObjectId,
		ref: 'Message',
	},
	bot: {
		type: mongoose.SchemaTypes.ObjectId,
		ref: 'Bot',
		required: true,
	},
	channel: {
		type: String,
		enum: Object.values(Constants.CHANNEL),
		required: true,
	},
	unreadMessages: {
		type: Number,
		min: 0,
		max: 1000,
		default: 0,
	},
	note: {
		type: String,
		max: 10000,
	},
	tags: [{
		type: mongoose.SchemaTypes.ObjectId,
		ref: 'Tag',
	}],
	deletedAt: {
		type: Date,
	},
}, { timestamps: true });

const Room = mongoose.model('Room', roomSchema);
module.exports = Room;

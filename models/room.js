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
	agents: [{
		type: mongoose.SchemaTypes.ObjectId,
		ref: 'User',
	}],
	lastMessage: {
		type: mongoose.SchemaTypes.ObjectId,
		ref: 'Message',
	},
	engineId: {
		type: mongoose.SchemaTypes.ObjectId,
		ref: 'NlpEngine',
		required: true,
	},
	channel: {
		type: String,
		enum: Object.values(Constants.CHANNEL),
		required: true,
	},
	platform: {
		type: String,
		enum: Object.values(Constants.PLATFORM),
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
		_id: {
			type: mongoose.SchemaTypes.ObjectId,
			ref: 'Tag',
		},
		content: String,
	}],
	deletedAt: {
		type: Date,
	},
	orgId: {
		type: mongoose.SchemaTypes.ObjectId,
		ref: 'Organizations'
	},
	pageId: {
		type: String,
	},
	agentJoins: [String],
}, { timestamps: true });

const Room = mongoose.model('Room', roomSchema);
module.exports = Room;

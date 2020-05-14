const { mongoose } = require('./index');

const Constants = require('../common/constants');

const notificationSchema = new mongoose.Schema({
	content: {
		type: String,
		required: true,
		max: 1000,
	},
	type: {
		type: String,
		enum: Object.values(Constants.NOTIFICATION.TYPES),
		default: Constants.NOTIFICATION.TYPES.NORMAL,
	},
	engineId: {
		type: mongoose.SchemaTypes.ObjectId,
		required: true,
		ref: 'NlpEngine',
	},
	botUser: {
		type: mongoose.SchemaTypes.ObjectId,
		ref: 'BotUser',
		require: true,
	},
	isHandled: {
		type: Boolean,
		default: false,
	},
	deletedAt: {
		type: Date,
	},
}, { timestamps: true });

const Notification = mongoose.model('Notification', notificationSchema);
module.exports = Notification;

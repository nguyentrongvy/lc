const { mongoose } = require('./index');

const tagSchema = new mongoose.Schema({
	content: {
		type: String,
		required: true,
		max: 1000,
	},
	engineId: {
		type: mongoose.SchemaTypes.ObjectId,
		required: true,
		ref: 'NlpEngine',
	},
	deletedAt: {
		type: Date,
	},
}, { timestamps: true });

const Tag = mongoose.model('Tag', tagSchema);
module.exports = Tag;

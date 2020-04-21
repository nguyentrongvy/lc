const { mongoose } = require('./index');

const tagSchema = new mongoose.Schema({
	content: {
		type: String,
		required: true,
		max: 1000,
	},
	nlpEngine: {
		type: mongoose.SchemaTypes.ObjectId,
		required: true,
		ref: 'nlpEngine',
	},
	deletedAt: {
		type: Date,
	},
}, { timestamps: true });

const Tag = mongoose.model('Tag', tagSchema);
module.exports = Tag;

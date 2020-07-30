const { mongoose } = require('./index');
const Constants = require('../common/constants');

const BroadcastMessageSchema = new mongoose.Schema({
  engineId: {
    type: mongoose.SchemaTypes.ObjectId,
    required: true
  },
  scheduleTime: Date,
  tags: [{
    type: mongoose.SchemaTypes.ObjectId,
    ref: 'Tag',
    content: String,
  }],
  responses: [{
    type: mongoose.SchemaTypes.ObjectId,
    ref: 'BroadcastResponse',
  }],
  channel: {
    type: String,
    enum: Object.values(Constants.CHANNEL),
  },
  orgId: {
    type: mongoose.SchemaTypes.ObjectId,
  },
  isAsap: Boolean,
  name: String,
  sentMessages: Number,
  deletedAt: {
    type: Date,
  },
}, {
  collection: 'broadcast-messages',
  timestamps: true
});

const BroadcastMessage = mongoose.model('BroadcastMessage', BroadcastMessageSchema);
module.exports = BroadcastMessage;

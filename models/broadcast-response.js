const { mongoose } = require('./index');
const Constants = require('../common/constants');

const broadcastResponseSchema = new mongoose.Schema({
  name: String,
  engineId: mongoose.SchemaTypes.ObjectId,
  orgId: mongoose.SchemaTypes.ObjectId,
  intents: [mongoose.SchemaTypes.ObjectId],
  responseType: {
    type: String,
    enum: Object.values(Constants.RESPONSE_TYPE),
  },
  text: [String],
  title: String,
  imageUrl: String,
  quickReplies: [{
    title: String,
    payload: String,
    intent: String,
    entities: {},
    botId: String,
  }],
  buttons: [{
    title: String,
    url: String,
    payload: String,
    intent: String,
    entities: {},
    botId: String,
  }],
  customPayload: String,
  cards: [{
    title: String,
    subTitle: String,
    imageUrl: String,
    buttons: [{
      title: String,
      url: String,
      payload: String,
      intent: String,
      entities: {},
      botId: String,
    }],
  }],
  deletedAt: {
    type: Date,
  },
}, {
  collection: 'broadcast-responses',
  collation: { locale: "vi" },
  timestamps: true,
});

module.exports = mongoose.model('BroadcastResponse', broadcastResponseSchema);

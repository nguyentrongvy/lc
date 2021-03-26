const axios = require('axios');

class BotUserService {
  async getBotUserByEngineId(engineId, channel) {
    const url = `${process.env.NLP_SERVER}/v1/bot-users/bot?channel=${channel}`;
    const rs = await axios.get(url, {
      headers: {
        authorization: process.env.SERVER_API_KEY,
        engineid: engineId,
      }
    });

    return rs && rs.data;
  }
}

module.exports = new BotUserService();
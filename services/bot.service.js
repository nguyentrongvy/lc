const axios = require('axios');

class BotService {
  async getBotByEngineId(engineId) {
    const url = `${process.env.NLP_SERVER}/bots/engineId/${engineId}`;
    const rs = await axios.get(url, {
      headers: {
        authorization: process.env.SERVER_API_KEY,
        engineid: engineId,
      }
    });

    return rs && rs.data && rs.data.data;
  }
}

module.exports = new BotService();
const axios = require('axios');

class BotUserService {
  async getBotUserByEngineId(engineId) {
    const url = `${process.env.NLP_SERVER}/v1/bot-users/bot`;
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
const axios = require('axios');

class BotUserService {
  async getBotUserByEngineId(engineId, channel, lastActiveDate, gender, pageId, shoudAddParam) {

    let url = `${process.env.NLP_SERVER}/v1/bot-users/bot`;
    if (channel) {
      url += `?channel=${channel}`;

      if (!shoudAddParam) {
        if (lastActiveDate) {
          url += `&lastActiveDate=${lastActiveDate}`;
        }

        if (gender) {
          url += `&gender=${gender}`;
        }
      }

      if (pageId) {
        url += `&pageId=${pageId}`;
      }
    }
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
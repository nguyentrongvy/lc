const axios = require('axios');
const logger = require('./logger/index');

class ScheduleService {
  async createJob(url, method, body, date, name) {
    try {
      const request = {
        url,
        method,
        data: body,
        headers: {
          authorization: process.env.SERVER_API_KEY,
        }
      };

      const apiUrl = `${process.env.SCHEDULER_SERVER}/api/v1/schedule`;

      await axios.post(apiUrl, {
        request,
        date,
        name
      }, {
        headers: { authorization: process.env.SERVER_API_KEY },
      });
    } catch (error) {
      logger.error(error);
    }
  }

  async deleteJob(name) {
    try {
      if (!name) return;

      const apiUrl = `${process.env.SCHEDULER_SERVER}/api/v1/schedule?name=${name}`;

      await axios.delete(apiUrl, {
        headers: { authorization: process.env.SERVER_API_KEY },
      });
    } catch (error) {
      logger.error(error);
    }
  }
}

module.exports = new ScheduleService();
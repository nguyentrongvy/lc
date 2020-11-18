const { ResponseSuccess } = require('../helpers/response.helper');
const { run } = require('../services/timer.service');
const Constants = require('../common/constants');

class TimerController {
  async runTimer(req, res, next) {
    try {
      await run(req.body.key);
      return ResponseSuccess(Constants.SUCCESS.RUN_TIMER_SUCCESS, '', res);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new TimerController();
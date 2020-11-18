const timerController = require('../controllers/timer.controller');
const authMiddleware = require('../middlewares/authentication.middleware');

exports.load = (app) => {
  app.post('/v1/timer', authMiddleware.verifyToken, timerController.runTimer);
} 
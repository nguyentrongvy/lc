const broadcastResponseController = require('../controllers/broadcast-response.controller');
const authenMiddleware = require('../middlewares/authentication.middleware');

exports.load = (app) => {
  app.get('/v1/broadcast-responses', authenMiddleware.verifyToken, broadcastResponseController.getBroadcastResponses);
  app.post('/v1/broadcast-responses', authenMiddleware.verifyToken, broadcastResponseController.create);
  app.put('/v1/broadcast-responses', authenMiddleware.verifyToken, broadcastResponseController.update);
} 
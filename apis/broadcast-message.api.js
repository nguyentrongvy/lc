const broadcastMessageController = require('../controllers/broadcast-message.controller');
const authenMiddleware = require('../middlewares/authentication.middleware');

exports.load = (app) => {
  app.get('/v1/broadcast-messages', authenMiddleware.verifyToken, broadcastMessageController.getListProactiveMessages);
  app.get('/v1/broadcast-messages/:id', authenMiddleware.verifyToken, broadcastMessageController.getById);
  app.post('/v1/broadcast-messages', authenMiddleware.verifyToken, broadcastMessageController.create);
  app.put('/v1/broadcast-messages/:id', authenMiddleware.verifyToken, broadcastMessageController.updateById);
  app.delete('/v1/broadcast-messages/:id', authenMiddleware.verifyToken, broadcastMessageController.deleteById);
} 
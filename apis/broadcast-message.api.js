const validate = require('express-validation');
const broadcastMessageValidation = require('../validations/broadcast-message.validation');
const broadcastMessageController = require('../controllers/broadcast-message.controller');
const authenMiddleware = require('../middlewares/authentication.middleware');

exports.load = (app) => {
  app.get('/v1/broadcast-messages', authenMiddleware.verifyToken, broadcastMessageController.getListProactiveMessages);
  app.get('/v1/broadcast-messages/:id', authenMiddleware.verifyToken, broadcastMessageController.getById);
  app.post('/v1/broadcast-messages', authenMiddleware.verifyToken, broadcastMessageController.create);
  app.put('/v1/broadcast-messages/:id', authenMiddleware.verifyToken, broadcastMessageController.updateById);
  app.delete('/v1/broadcast-messages/:id', authenMiddleware.verifyToken, broadcastMessageController.deleteById);
  //customer api
  app.post('/v1/messages/broadcast',
    [
      validate(broadcastMessageValidation.broadcastMessage()),
      authenMiddleware.verifyToken,
    ],
    broadcastMessageController.createBroadcastMessages,
  );
  app.post('/v1/messages/broadcast/schedule', [
    authenMiddleware.verifyToken,
    validate(broadcastMessageValidation.sendMessage()),
  ], broadcastMessageController.sendMessage);
  app.put('/v1/messages/broadcast/:id',
    [
      validate(broadcastMessageValidation.paramId()),
      validate(broadcastMessageValidation.broadcastMessage()),
      authenMiddleware.verifyToken,
    ],
    broadcastMessageController.updateBroadcastMessageCustomer
  )
  app.get('/v1/messages/broadcast/users', [
    validate(broadcastMessageValidation.getUsers()),
    authenMiddleware.verifyToken,
  ], broadcastMessageController.getSentUsers);
  app.put('/v1/messages/broadcast/:id/stop', [
    validate(broadcastMessageValidation.paramId()),
    authenMiddleware.verifyToken,
  ], broadcastMessageController.stopBroadcast);
}
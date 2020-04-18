const roomController = require('../controllers/room.controller');
const authenMiddleware = require('../middlewares/authentication.middleware');

exports.load = (app) => {
    app.put('/api/v1/room/:roomID/join', roomController.joinRoom);
    app.put('/api/v1/room/:roomID/left', roomController.leftRoom);
    app.put('/api/v1/room/:roomID/assign', roomController.assignAgentToRoom);
};
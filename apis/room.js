const validate = require('express-validation');

const roomValidation = require('../validations/room.validation');
const authMiddleware = require('../middlewares/authentication.middleware');
const roomController = require('../controllers/room.controller');

exports.load = (app) => {
    app.get(
        '/api/v1/rooms/unassigned',
        [
            validate(roomValidation.queryGetRooms()),
            authMiddleware.verifyToken,
        ],
        roomController.getUnassignedRooms
    );

    app.get(
        '/api/v1/rooms/assigned',
        [
            validate(roomValidation.queryGetRooms()),
            authMiddleware.verifyToken,
        ],
        roomController.getAssignedRooms,
    );

    app.get(
        '/api/v1/rooms/own',
        [
            validate(roomValidation.queryGetRooms()),
            authMiddleware.verifyToken,
        ],
        roomController.getOwnRooms,        
    );
};

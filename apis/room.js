const validate = require('express-validation');

const roomValidation = require('../validations/room.validation');
const commonValidation = require('../validations/common.validation');
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

	app.put(
		'/api/v1/rooms/:id/join',
		[
			validate(commonValidation.paramId),
			authMiddleware.verifyToken,
		],
		roomController.joinRoom,
	);
	app.put(
		'/api/v1/rooms/:id/left',
		[
			validate(commonValidation.paramId),
			authMiddleware.verifyToken,
		],
		roomController.leftRoom,
	);
	app.put(
		'/api/v1/rooms/:id/assign',
		[
			validate(commonValidation.paramId),
			authMiddleware.verifyToken,
		],
		roomController.assignAgentToRoom,
	);

};

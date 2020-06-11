const validate = require('express-validation');

const commonValidation = require('../validations/common.validation');
const authMiddleware = require('../middlewares/authentication.middleware');
const roomController = require('../controllers/room.controller');

exports.load = (app) => {
	app.get(
		'/api/v1/users/:id/room',
		[
			validate(commonValidation.paramId()),
			authMiddleware.verifyToken,
		],
		roomController.getRoomByUserId,
	);

	app.put(
		'/api/v1/rooms/:id/stop',
		[
			validate(commonValidation.paramId()),
			authMiddleware.verifyToken,
		],
		roomController.stopBot
	);

	app.put(
		'/api/v1/rooms/:id/start',
		[
			validate(commonValidation.paramId()),
			authMiddleware.verifyToken,
		],
		roomController.startBot
	);

	app.get(
		'/api/v1/rooms/unassigned',
		[
			validate(commonValidation.pagination()),
			authMiddleware.verifyToken,
		],
		roomController.getUnassignedRooms
	);

	app.get(
		'/api/v1/rooms/assigned',
		[
			validate(commonValidation.pagination()),
			authMiddleware.verifyToken,
		],
		roomController.getAssignedRooms,
	);

	app.get(
		'/api/v1/rooms/own',
		[
			validate(commonValidation.pagination()),
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

	app.get(
		'/api/v1/rooms/:id',
		[
			validate(commonValidation.paramId),
			authMiddleware.verifyToken,
		],
		roomController.getRoom,
	);

	app.put(
		'/api/v1/rooms/:id',
		[
			validate(commonValidation.paramId()),
			authMiddleware.verifyToken,
		],
		roomController.updateRoomById,
	);

	app.get(
		'/api/v1/rooms/unassigned/count',
		[
			authMiddleware.verifyToken,
		],
		roomController.countUnassignedRooms
	)
};

const constants = {
	ERROR: {
		DATABASE: 'Database error.',
		INVALID_INTEGER: 'Id is not an integer.',
		NOT_EXISTED_USER: 'User id is not existed.',
		EXISTED_USERNAME: 'Username is existed.',
		COMMON: 'Opps, something went wrong.',
		REQUIRED_USERNAME: 'Username is a required field.',
		REQUIRED_PASSWORD: 'Password is a required field.',
		REQUIRED_FIELD: 'Username or password must not be empty.',
		ROOM_NOT_FOUND: 'NOT_EXIST_ROOM',
		INVALID_TOKEN: 'INVALID_TOKEN',
	},
	SUCCESS: {
		GET_LIST_USERS: 'Get list users successfully.',
		GET_USER_BY_ID: 'Get user by id successfully.',
		CREATE_USER: 'Create new user successfully.',
		DELETE_USER: 'Deleting user by id successfully.',
		UPDATE_USER: 'Update user successfully.',
		JOIN_ROOM: 'JOIN_ROOM_SUCCESS',
		LEFT_ROOM: 'LEFT_ROOM_SUCCESS',
		SEND_MESSAGE: 'SEND_MESSAGE_SUCCESS',
		GET_LIST_MESSAGE: 'GET_LIST_MESSAGE_SUCCESS',
		GET_ROOMS: 'GET_ROOM_SUCCESS',
		GET_TAGS: 'GET_TAG_SUCCESS',
		UPDATE_ROOM_SUCCESS: 'UPDATE_ROOM_SUCCESS',
	},
	REGEX: {
		OBJECT_ID: /^(?=[a-f\d]{24}$)(\d+[a-f]|[a-f]+\d)/i,
	},
	CHANNEL: {
		WEB: 'web',
		FB: 'facebook',
	},
	ACTION: {
		CHAT: 'chat',
		JOIN_ROOM: 'join_room',
		LEFT_ROOM: 'left_room',
	},
	EVENT: {
		CHAT: 'chat',
	},
	EVENT_TYPE: {
		SEND_MESSAGE: 'send_message',
		LAST_MESSAGE_AGENT: 'last_message_agent',
		SEND_UNASSIGNED_CHAT: 'unassigned_chat',
		SEND_USER_MESSAGE: 'user_message',
	},
	REDIS: {
		PREFIX: {
			ROOM: 'room_',
		},
		ROOM: {
			EXPIRE_TIME: 20,
		},
	},
};

module.exports = Object.freeze(constants);

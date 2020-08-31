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
		DATA_ERROR: 'Data_error',
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
		STOP_BOT: 'STOP_BOT_SUCCESS',
		START_BOT: 'START_BOT_SUCCESS',
		COUNT_ROOMS: 'COUNT_ROOMS_SUCCESS',
		GET_NOTIFICATIONS: 'GET_NOTIFICATIONS_SUCCESS',
		CREATE_NOTIFICATION: 'CREATE_NOTIFICATION_SUCCESS',
		HANDLE_NOTIFICATION: 'HANDLE_NOTIFICATION_SUCCESS',
		GET_ROOM: 'GET_ROOM',
		GET_RESPONSE_SUCCESS: 'GET_RESPONSE_SUCCESS',
		CREATE_RESPONSE_SUCCESS: 'CREATE_RESPONSE_SUCCESS',
	},
	REGEX: {
		OBJECT_ID: /^(?=[a-f\d]{24}$)(\d+[a-f]|[a-f]+\d)/i,
	},
	CHANNEL: {
		WEB: 'web',
		FB: 'facebook',
		ZALO: 'zalo',
		Freshchat: 'freshchat',
		Glia: 'glia',
		Custom: 'custom',
		Messenger: 'messenger',
		Voice: 'voice',
		Kore: 'kore',
		Freshdesk: 'freshdesk',
		Ivr: 'ivr',
	},
	ACTION: {
		CHAT: 'chat',
		JOIN_ROOM: 'join_room',
		LEFT_ROOM: 'left_room',
	},
	EVENT: {
		CHAT: 'chat',
		NOTIFICATION: 'notification',
		Maintenance: 'maintenance',
	},
	EVENT_TYPE: {
		SEND_MESSAGE: 'send_message',
		LAST_MESSAGE_AGENT: 'last_message_agent',
		SEND_UNASSIGNED_CHAT: 'unassigned_chat',
		SEND_USER_MESSAGE: 'user_message',
		FOCUS_INPUT: 'focus',
		CLEAR_TIMER: 'clear_timer',
		SEND_NOTIFICATION: 'send_notification',
		JOIN_ROOM: 'join_room',
		LEFT_ROOM: 'left_room',
	},
	REDIS: {
		PREFIX: {
			ROOM: 'room_',
			STOP_BOT: 'stoppedBot_',
			PROACTIVE_MESSAGE: 'proactiveMessage_',
			DATA_BOT_USER: 'dataBotUser_',
			BROADCAST_MESSAGE: 'broadcastMessage_',
			LiveChatMaintenance: 'liveChatMaintenance',
		},
		ROOM: {
			EXPIRE_TIME: 15 * 1000, // ms
			STOP_TIME: 60 * 60 * 24 * 1000, // ms
		},
		HASHMAP: {
			STATUS: 'status',
		},
		CHANNEL: {
			STOP_BOT: 'stop_bot',
		},
	},
	CHAT_CONSTANTS: {
		DEFAULT_NAME: 'Guest',
	},
	FLAG: {
		SEARCH_BY_ROOM_NAME: 'search_by_room_name',
		SEARCH_BY_TAGS: 'search_by_tags',
	},
	NOTIFICATION: {
		LIMIT: 10,
		TYPES: {
			NORMAL: 'normal',
			JOIN_ROOM: 'join_room',
		},
	},
	ERROR_CODE: {
		EXISTED_BROADCAST_MESSAGE: 1260,
		EXISTED_BROADCAST_RESPONSE: 1270,
	},
	GLOBAL_FIELDS: [
		'name',
		'phoneNumber',
	],

	RESPONSE_TYPE: {
		Text: 'text',
		QuickReply: 'quick_replies',
		CustomPayload: 'custom_payload',
		Image: 'image',
		Card: 'card',
		Button: 'button',
		RedirectIntent: 'redirect_intent',
		RedirectBot: 'redirect_bot',
	},
};

module.exports = Object.freeze(constants);

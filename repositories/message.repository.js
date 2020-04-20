const BaseRepository = require('../repositories/base.repository');

module.exports = class MessageRepository extends BaseRepository {
	constructor() {
		super('Message');
	}
};
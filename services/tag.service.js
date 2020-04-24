const { tagRepository } = require('../repositories/index');

class TagsService {
    async getAll() {
        return await tagRepository.getAll();
    }
}

module.exports = new TagsService();
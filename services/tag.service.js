const { tagRepository } = require('../repositories/index');

class TagsService {
    async getAll(engineId) {
        const options = {
            where: {
                engineId: engineId,
            },
        }
        return await tagRepository.getAll(options);
    }
}

module.exports = new TagsService();
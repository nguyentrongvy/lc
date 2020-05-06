const { tagRepository } = require('../repositories/index');

class TagsService {
    async getAll(nlpEngine) {
        const options = {
            where: {
                nlpEngine: nlpEngine,
            },
        }
        return await tagRepository.getAll(options);
    }
}

module.exports = new TagsService();
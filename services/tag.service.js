const _ = require('lodash');

const { tagRepository } = require('../repositories/index');
const Constants = require('../common/constants');

class TagsService {
    async getAll(engineId) {
        const options = {
            where: {
                engineId: engineId,
            },
        }
        return await tagRepository.getAll(options);
    }

    async createTags(engineId, tags) {
        if (!tags) return [];
        const tagsUnique = _.uniqBy(tags);

        // find tags exist db.
        let existingTags = await getTags(tags, engineId);

        existingTags = existingTags.map(({ _id, content }) => ({ _id, content }));

        let tagsNew = tagsUnique.reduce((init, currentValue) => {
            const exist = existingTags.some(t => t.content === currentValue);
            if (!exist) init.push({
                content: currentValue,
                engineId,
            });

            return init;
        }, []);

        tagsNew = await tagRepository.create(tagsNew);
        tagsNew = tagsNew.map(({ _id, content }) => ({ _id, content }));

        return [...existingTags, ...tagsNew];
    }
}

async function getTags(content, engineId) {
    let existingTags = [];
    let page = 1;
    while (true) {
        const tags = await tagRepository.getMany({
            where: {
                content,
                engineId,
            },
            fields: 'content',
            page,
            limit: Constants.TAG_LIMIT,
        });

        existingTags = existingTags.concat(tags);
        page++;
        if (tags.length < 20) {
            break;
        }
    }

    return existingTags;
}

module.exports = new TagsService();
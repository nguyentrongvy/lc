const axios = require('axios');
const { broadcastResponseRepository } = require('../repositories');
const { ERROR, ERROR_CODE, REDIS, CHANNEL, GLOBAL_FIELDS } = require('../common/constants');
const _ = require('lodash');

class BroadcastResponseService {
  async createBroadcastResponse(data, engineId, orgId) {
    if (!data || !data.name || !engineId) throw new Error(ERROR.DATA_ERROR);

    const isDuplicated = await this.checkDuplicateBroadcastResponseByName(data.name, engineId, orgId);
    if (isDuplicated) throw new Error(ERROR_CODE.EXISTED_BROADCAST_RESPONSE);

    data.orgId = orgId;
    data.engineId = engineId;

    let response = await broadcastResponseRepository.create(data);
    return response;
  }

  async checkDuplicateBroadcastResponseByName(name, engineId, orgId, id) {
    const options = {
      where: {
        name,
        engineId,
        _id: { $ne: id },
        orgId,
      },
    };
    const response = await broadcastResponseRepository.getOne(options);
    return !!response;
  }

  async getBroadcastResponseByEngineId(engineId, orgId) {
    if (!engineId || !orgId) throw new Error(ERROR.DATA_ERROR);

    const options = {
      where: {
        engineId,
        orgId,
      }
    }
    const responses = await broadcastResponseRepository.getAll(options);

    return responses;
  }

  async getBroadcastResponseByIds(engineId, orgId, ids) {
    if (!engineId || !orgId) throw new Error(ERROR.DATA_ERROR);

    const options = {
      where: {
        engineId,
        orgId,
        _id: { $in: ids }
      }
    }
    const responses = await broadcastResponseRepository.getAll(options);

    return responses;
  }

  getRandomResponseText(responseTexts, allParameters, redisInfo) {
    if (!responseTexts) return '';
    if (!Array.isArray(responseTexts)) {
      responseTexts = [responseTexts];
    }
    responseTexts = _.compact(responseTexts);

    if (this.isEmpty(allParameters) && this.isEmpty(redisInfo)) {
      const randomIndex = Math.floor(Math.random() * responseTexts.length);
      return responseTexts[randomIndex];
    }

    let parametersCopy = Object.assign({}, allParameters);
    for (const entity in parametersCopy) {
      const data = parametersCopy[entity];
      // check if is composite entity
      if (typeof data === 'object') {
        if (Array.isArray(data)) {
          parametersCopy[entity] = data.map(item => {
            if (typeof item === 'object') {
              return item.value;
            }
            return item;
          });
        } else {
          parametersCopy[entity] = data.value;
        }
      }
    }
    parametersCopy = _.omitBy(parametersCopy, '');

    let responses = countParameterInSentence(responseTexts, Object.keys(parametersCopy));
    if (!responses || responses.length == 0) {
      return '';
    }

    const maxCountResponse = _.maxBy(responses, 'count');
    responses = responses.filter(response => response.count == maxCountResponse.count);

    const randomIndex = Math.floor(Math.random() * responses.length);
    let response = responses[randomIndex];
    response = this.replaceParameter(response.text, parametersCopy, redisInfo);
    return response || '';
  };

  isEmpty(obj) {
    return !obj || Object.keys(obj).length === 0;
  }

  replaceParameter(text, allParameters, redisInfo) {
    if (!text) return '';

    if (!allParameters || !redisInfo) return text;

    Object.keys(allParameters).forEach(key => {
      if (Array.isArray(allParameters[key])) {
        text = replaceParameterIsList(allParameters[key], key, text);
      } else {
        text = replaceGeneralParameter(redisInfo, allParameters, key, text);
      }

    });

    GLOBAL_FIELDS.forEach(field => {
      const regex = new RegExp(`{userInfo\.${field}}`, 'g');
      const fieldValue = redisInfo.userInfo && redisInfo.userInfo[field];
      text = text.replace(regex, fieldValue || '');
    });

    return text;
  };

  async updateBroadcastResponse(data, engineId, orgId) {
    if (!data || !data._id || !data.name || !engineId) throw new Error(ERROR.DATA_ERROR);

    const isDuplicated = await this.checkDuplicateBroadcastResponseByName(data.name, engineId, orgId, data._id);
    if (isDuplicated) throw new Error(ERROR_CODE.EXISTED_BROADCAST_RESPONSE);

    const options = {
      where: {
        _id: data._id,
        engineId,
        orgId,
      },
      data,
    };
    let response = await broadcastResponseRepository.updateOne(options);
    return response;
  }

  async getResponseFromVaByNames(engineId, names) {
    if (!engineId
      || !names
      || names.length == 0
    ) {
      throw new Error(ERROR.DATA_ERROR);
    }
    const url = `${process.env.NLP_SERVER}/v1/responses/names?names=${names}`;
    const res = await axios.get(url, {
      headers: {
        authorization: process.env.SERVER_API_KEY,
        engineId,
      },
    });

    return res && res.data && res.data.data;
  }
}

module.exports = new BroadcastResponseService();

function countParameterInSentence(responses, entities) {
  if (!responses || !entities) return;
  return responses.reduce((countResponses, currentValue) => {
    let count = 0;
    entities.forEach(entity => {
      if (currentValue.includes(`{${entity}}`)) {
        count++;
      }
    });
    countResponses.push({ count: count, text: currentValue });
    return countResponses;
  }, []);
}

function replaceParameterIsList(entities, key, text) {
  if (!entities || !Array.isArray(entities) || entities.length == 0) return text;
  const regexPlaceString = `{${key}\\[\\d+\\]}`;
  const regexPlace = new RegExp(regexPlaceString, 'g');

  const regexMatchString = `${key}\\[(\\d+)\\]`;
  const regexMatch = new RegExp(regexMatchString);
  text = text.replace(regexPlace, function (match) {
    if (entities[regexMatch.exec(match)[1]]) {
      return entities[regexMatch.exec(match)[1]];
    } else {
      return match;
    }
  });

  const stringConvert = entities.join(', ');
  const replaceString = `{${key}}`;
  const regex = new RegExp(replaceString, 'gi');
  text = text.replace(regex, stringConvert);

  return text;
}

function replaceGeneralParameter(redisInfo, allParameters, key, text) {
  if (!text) return '';
  if (!redisInfo || !key) return text;
  const value = _.get(redisInfo, key);
  const replaceString = `\\{${key}\\}`;
  try {
    const regex = new RegExp(replaceString, 'gi');
    if (!value) {
      if (allParameters[key] || allParameters[key] === 0) {
        text = text.replace(regex, allParameters[key]);
      }
    } else {
      text = text.replace(regex, value);
    }

    return text;
  } catch (error) {
    logger.error(error);
    return text;
  }
}
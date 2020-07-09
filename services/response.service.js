const axios = require('axios');
const _ = require('lodash');

class ResponseService {
  async getByIds(ids, engineId) {
    if (!ids || ids.length == 0) return;

    ids = ids.join(',');
    const url = `${process.env.NLP_SERVER}/v1/responses/ids?ids=${ids}`;
    const rs = await axios.get(url, {
      headers: {
        authorization: process.env.SERVER_API_KEY,
        engineid: engineId,
      }
    });

    return rs && rs.data && rs.data.data;
  }

  getRandomResponseText(responseTexts, allParameters, redisInfo) {
    if (!responseTexts) return '';
    if (!Array.isArray(responseTexts)) {
      responseTexts = [responseTexts];
    }
    responseTexts = _.compact(responseTexts);

    if (this.isEmpty(allParameters)) {
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

    return text;
  };
}

module.exports = new ResponseService();

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
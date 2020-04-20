const axios = require('axios');
const _ = require('lodash');

class UsersService {
    async getUser(agentID) {
        const url = `${process.env.AUTH_SERVER}/users/${agentID}`;
        const res = await axios.get(url, {
            headers: { authorization: process.env.SERVER_API_KEY }
        });

        const username = _.get(res, 'data.data.name', '');
        return username;
    }
}

module.exports = new UsersService();
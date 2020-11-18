'use strict';

const moment = require('moment');

class DateTimeHelper {
    addSecond(date, second) {
        return moment(date).add(second, 'seconds').toDate();
    }
}

module.exports = new DateTimeHelper();
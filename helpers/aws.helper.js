const AWS = require('aws-sdk');
const IAM_USER_KEY = process.env.AWS_ACCESS_KEY;
const IAM_USER_SECRET = process.env.AWS_SECRET_KEY;
const REGION = process.env.REGION || 'ap-southeast-1';

class AwsHelper {
    getCloudWatch() {
        return new AWS.CloudWatchLogs({
            accessKeyId: IAM_USER_KEY,
            secretAccessKey: IAM_USER_SECRET,
            region: REGION,
        });
    }
}

module.exports = new AwsHelper();
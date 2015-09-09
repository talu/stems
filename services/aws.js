'use strict';


var di = require('di'),
    AWS = require('aws-sdk'),
    http = require('http'),
    https = require('https'),
    Config = require('./config');


var Aws = function(config) {

  // Bump up the default of 5 so we can do a lot more work at once
  http.globalAgent.maxSockets = 500;
  https.globalAgent.maxSockets = 500;


  // Set global AWS configuration
  AWS.config.update({
    accessKeyId: config.get('aws:accessKey'),
    secretAccessKey: config.get('aws:secretKey'),
    region: config.get('aws:region'),
    sslEnabled: true,
    httpOptions: {
      agent: https.globalAgent
    }
  });

  return AWS;

};


// Setup dependencies
di.annotate(Aws, new di.Inject(Config));


// Export our service
module.exports = Aws;

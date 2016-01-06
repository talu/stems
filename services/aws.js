'use strict';


var di = require('di'),
    AWS = require('aws-sdk'),
    http = require('http'),
    https = require('https'),
    Config = require('./config');


var Aws = function(config) {

  // Bump up the default of 5 in Node < 0.12 so we can do a lot more work at once
  if (http.globalAgent.maxSockets !== Infinity) {
    http.globalAgent.maxSockets = Infinity;
  }
  if (https.globalAgent.maxSockets !== Infinity) {
    https.globalAgent.maxSockets = Infinity;
  }

  // Set global AWS configuration
  AWS.config.update({
    accessKeyId: config.get('aws:accessKey'),
    secretAccessKey: config.get('aws:secretKey'),
    region: config.get('aws:region'),
    sslEnabled: true
  });

  return AWS;

};


// Setup dependencies
di.annotate(Aws, new di.Inject(Config));


// Export our service
module.exports = Aws;

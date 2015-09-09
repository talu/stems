'use strict';


var di = require('di'),
    krypt = require('krypt'),
    Config = require('./config');


var Krypt = function(config) {

  // Set default secret key for encryption / decryption
  var keys = config.get('secrets:keys'),
      secretKey = keys[config.get('secrets:defaultKey')];

  if (!secretKey) {
    throw new Error('No default encryption key could be found');
  }

  // Set the default secret to use for encryption / decryption
  krypt.setSecret(secretKey.value);
  krypt.setIterations(secretKey.iterations);

  return krypt;

};


// Setup dependencies
di.annotate(Krypt, new di.Inject(Config));


// Export our service
module.exports = Krypt;

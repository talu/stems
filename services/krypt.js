'use strict';


var di = require('di'),
    krypt = require('krypt'),
    Config = require('./config');


var Krypt = function(config) {

  // Set default secret key for encryption / decryption
  var keys = config.get('krypt:keys'),
      secretKey = keys[config.get('krypt:defaultKey')];

  if (!secretKey) {
    throw new Error('No default encryption key could be found');
  }

  // Set the default secret to use for encryption / decryption
  krypt.setSecret(secretKey.value);
  krypt.setIterations(secretKey.iterations);

  // Set the global context for encypted payloads
  // Used by other services to know what key to use to decrypt
  krypt.setContext({
    encrypted: true,
    keyName: config.get('krypt:defaultKey')
  });

  return krypt;

};


// Setup dependencies
di.annotate(Krypt, new di.Inject(Config));


// Export our service
module.exports = Krypt;

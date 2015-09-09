'use strict';


var nconf = require('nconf'),
    path = require('path'),
    krypt = require('krypt');


var Config = function() {

  //
  // Setup nconf to use (in-order):
  //   1. Command-line arguments
  //   2. Environment variables
  //   2. Custom config file
  //   2. Defaults
  //
  nconf
    .argv()
    .env('_');

  var configFile = nconf.get('config');

  // Load custom config file
  if (configFile && hasConfigAccess(configFile)) {
    nconf.file(
      'config',
      {
        file: path.resolve(process.cwd(), configFile),
        format: nconfKryptFormat('TALU_PAYMENT_SECRET')
      }
    );
  }

  // Last case scenario, we set sane defaults
  nconf.file('defaults', path.resolve(process.cwd(), './etc/defaults.json'));
  return nconf;
};

/**
 * Check for config access
 */

function hasConfigAccess(configFile) {
  var hasAccess = !(/\/production\.json$/).test(configFile) || process.env.NODE_ENV === 'production';

  if (!hasAccess) {
    console.log('WARNING! - You must set NODE_ENV to production to use the production configuration.');
  }

  // If using prod config, need to be in prod environment
  return hasAccess;
}


/**
 * # Load Secrets
 * Load secrets from disk, decrypt them, and return an object
 */
function nconfKryptFormat(envVar) {

  var configSecret = process.env[envVar];

  return {
    stringify: function (obj, replacer, spacing) {
      return JSON.stringify(krypt.encrypt(obj, configSecret), replacer || null, spacing || 2);
    },
    parse: function (str) {
      var raw = JSON.parse(str);
      if (raw.iv && raw.salt && raw.value) {
        try {
          var result = krypt.decrypt(raw, configSecret);
          return JSON.parse(result);
        } catch (err) {
          console.log('Unable to decrypt config file due to: ' + err.stack);
          throw err;
        }
      }
      return raw;
    }
  };
}


// Export our service
module.exports = Config;

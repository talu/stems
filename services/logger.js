'use strict';


var winston = require('winston'),
    _ = require('lodash'),
    di = require('di'),
    Config = require('./config');

var Log = function(config) {

  var logOptions = {
    label: process.pid,
    timestamp: true,
    prettyPrint: true,
    colorize: true
  };

  if (config.get('silly')) {
    logOptions.level = 'silly';
  } else if (config.get('debug')) {
    logOptions.level = 'debug';
  } else if (config.get('verbose')) {
    logOptions.level = 'verbose';
  } else if (this.logLevel) {
    logOptions.level = this.logLevel;
  }

  if (config.get('log')) {
    logOptions.filename = config.get('log');
    winston.add(winston.transports.File, logOptions);
  }

  // Configure the console logger
  winston.remove(winston.transports.Console);
  winston.add(winston.transports.Console, logOptions);

  // Configure the graylog logger
  if (config.get('logger:graylog:enabled')) {
    var graylogOptions = config.get('logger:graylog');
    _.defaults(graylogOptions, logOptions);
    winston.add(require('winston-gelfling').Gelfling, graylogOptions);
  }

  return winston;

};

// Instance specific log level
Log.prototype.logLevel = null;


// Setup dependencies
di.annotate(Log, new di.Inject(Config));


// Export our service
module.exports = Log;

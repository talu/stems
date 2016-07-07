'use strict';

var
  di = require('di'),
  winston = require('winston'),
  Logger = require('../../services/logger');

function TestLogger() {

  var logOptions = {
    label: process.pid,
    timestamp: true,
    prettyPrint: true,
    colorize: true,
    level: 'error'
  };

  // Configure the console logger
  winston.remove(winston.transports.Console);
  winston.add(winston.transports.Console, logOptions);

  return winston;
}

di.annotate(TestLogger, new di.Provide(Logger));
module.exports = TestLogger;

'use strict';

var
  di = require('di'),
  Logger = require('../../services/logger');

var TestLogger = Logger;
TestLogger.prototype.logLevel = 'error';

di.annotate(TestLogger, new di.Provide(Logger));
module.exports = TestLogger;

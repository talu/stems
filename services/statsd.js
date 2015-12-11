'use strict';


var di = require('di'),
    _ = require('lodash'),
    HotShots = require('hot-shots'),
    Logger = require('./logger'),
    Config = require('./config');


var StatsD = function(config, logger) {
  this.config = config.get('statsd');
  this.logger = logger;
  this.enabled = this.config && this.config.enabled;

  var options = _.pick(this.config,
    ['host', 'port', 'prefix', 'suffix', 'cacheDns',
     'mock', 'globalTags', 'maxBufferSize', 'bufferFlushInterval', 'telegraf']);

  options.host = options.host || '127.0.0.1';
  options.globalTags = options.globalTags || [];

  // Tag with the node number and hostname
  if (process.env.DISCOVER_NODE_NUMBER) {
    options.globalTags.push('node:' + process.env.DISCOVER_NODE_NUMBER);
  }

  if (this.enabled) {
    this.statsD = new HotShots(options);
    this.logger.log('debug', 'Configured StatsD client using config: ', options);
  }
};


/**
 * Raw StatsD client
 */
StatsD.prototype.client = function client() {
  return this.statsD;
};


/**
 * If we are enabled
 */
StatsD.prototype.isEnabled = function isEnabled() {
  return this.enabled;
};


// Setup dependencies
di.annotate(StatsD, new di.Inject(Config, Logger));


// Export our service
module.exports = StatsD;

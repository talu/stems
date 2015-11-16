'use strict';


var di = require('di'),
    _ = require('lodash'),
    os = require('os'),
    DatadogConnect = require('connect-datadog'),
    DatadogStatsD = require('node-dogstatsd'),
    Logger = require('./logger'),
    Config = require('./config');


var Datadog = function(config, logger) {
  this.config = config.get('datadog');
  this.logger = logger;
  this.enabled = this.config && this.config.enabled;

  var host = this.config.host || process.env.HOST_IP || '127.0.0.1',
      port = this.config.port || '8125',
      options = {
        'global_tags': this.config.globalTags || []
      };

  // Tag with the node number and hostname
  if (process.env.DISCOVER_NODE_NUMBER) {
    options['global_tags'].push('node:' + process.env.DISCOVER_NODE_NUMBER);
  }
  options['global_tags'].push('host:' + os.hostname());

  if (this.enabled) {
    this.statsD = new DatadogStatsD.StatsD(host, port, null, options);
    this.logger.log('debug', 'Configured StatsD client using config: ', {
      host: host,
      port: port,
      options: options
    });
  }
};


/**
 * Connect Middleware
 */
Datadog.prototype.middleware = function middleware(options) {
  var passthrough = function (req, res, next) { next(); },
      defaultOptions = {
        dogstatsd: this.statsD,
        method: true,
        protocol: true,
        'response_code': true
      };

  options = _.defaults(defaultOptions, options || {});

  return this.enabled ? new DatadogConnect(options) : passthrough;
};

/**
 * Raw StatsD client
 */
Datadog.prototype.client = function client() {
  return this.statsD;
};


// Setup dependencies
di.annotate(Datadog, new di.Inject(Config, Logger));


// Export our service
module.exports = Datadog;

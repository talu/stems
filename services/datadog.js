'use strict';


var di = require('di'),
    _ = require('lodash'),
    os = require('os'),
    DatadogConnect = require('connect-datadog'),
    DatadogStatsD = require('node-dogstatsd'),
    Logger = require('./logger'),
    Config = require('./config'),
    UsherActivityPoller = require('usher/lib/activity/poller');


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
 * Inject stat tracking into usher activities
 */
Datadog.prototype.usher = function usher(options) {

  if (!this.enabled) { return; }

  options = options || {};

  var self = this,
      statPrefix = options.stat || 'node.usher.activity',
      originalTaskHandler = UsherActivityPoller.prototype._onActivityTask;

  UsherActivityPoller.prototype._onActivityTask = function datadogIntercept(task) {
    var start = new Date();

    var originalSuccessHandler = task.respondCompleted,
        originalFailureHandler = task.respondFailed,
        statTags = [
          'domain:' + this.domain,
          'name:' + task.config.activityType.name,
          'tasklist:' + this.options.taskList.name,
          'version:' + task.config.activityType.version
        ];

    task.respondCompleted = function datadogCompleteInterceptor(result, cb) {
      // Log some stats with datadog
      statTags.push('result:success');
			self.statsD.increment(statPrefix + '.result.success', 1, statTags);
			self.statsD.increment(statPrefix + '.result.all' , 1, statTags);
      self.statsD.histogram(statPrefix + '.execution_time', (new Date() - start), 1, statTags);

      // Call original response handler
      originalSuccessHandler.call(this, result, cb);
    };

    task.respondFailed = function datadogFailureInterceptor(name, message, cb) {
      // Log some stats with datadog
      statTags.push('result:failed');
			self.statsD.increment(statPrefix + '.result.failed', 1, statTags);
			self.statsD.increment(statPrefix + '.result.all' , 1, statTags);
      self.statsD.histogram(statPrefix + '.execution_time', (new Date() - start), 1, statTags);

      // Call original response handler
      originalFailureHandler.call(this, name, message, cb);
    };

    // Execute the original handler
    originalTaskHandler.call(this, task);
  };

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

'use strict';


var di = require('di'),
    _ = require('lodash'),
    Logger = require('./logger'),
    Config = require('./config'),
    StatsD = require('./statsd'),
    UsherActivityPoller = require('usher/lib/activity/poller');


var Metrics = function(config, logger, statsD) {
  this.config = config.get('metrics');
  this.logger = logger;
  this.enabled = statsD.isEnabled();
  this.statsD = statsD.client();
};


/**
 * Connect Middleware
 */
Metrics.prototype.expressMiddleware = function expressMiddleware(options) {
  var self = this,
      defaultOptions = {
        stat: 'node.express.router',
        method: true,
        protocol: true,
        responseCode: true,
        baseUrl: true,
        path: false,
        tags: []
      };

  options = _.defaults(defaultOptions, options || {});

	return function metricMiddleware(req, res, next) {
    if (!self.enabled) {
      return next();
    }

		if (!req._startTime) {
			req._startTime = new Date();
		}

		var end = res.end;
		res.end = function (chunk, encoding) {
      var statTags = [].concat(options.tags);

			res.end = end;
			res.end(chunk, encoding);

			if (!req.route || !req.route.path) {
				return;
			}

      // Track route as a tag
			var baseUrl = (options.baseUrl !== false) ? req.baseUrl : '',
          route = baseUrl + req.route.path;

      // Baucis does not behave well with named routes
      route = route.replace(/\/([0-9a-f]{64})(\/?)/g, '/:id$2');
      route = route.replace(/\/([0-9a-f]{24})(\/?)/g, '/:id$2');

			statTags.push('route:' + route);

      // Track the request method as a tag
			if (options.method) {
				statTags.push('method:' + req.method.toLowerCase());
			}

      // Track the protocol as a tag
			if (options.protocol && req.protocol) {
				statTags.push('protocol:' + req.protocol);
			}

      // Track the actual path as a tag
			if (options.path !== false) {
				statTags.push('path:' + baseUrl + req.path);
			}

      // Track the response code as a tag and individual counters
			if (options.responseCode) {
				statTags.push('response_code:' + res.statusCode);
				self.statsD.increment(options.stat + '.response_code.' + res.statusCode , 1, statTags);
				self.statsD.increment(options.stat + '.response_code.all' , 1, statTags);
			}

      // Track the actual request
			self.statsD.histogram(options.stat + '.response_time', (new Date() - req._startTime), 1, statTags);
		};

		next();
	};

};


/**
 * Inject stat tracking into usher activities
 */
Metrics.prototype.usher = function usher(options) {

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
 * Inject stat tracking into mongo queries
 */
Metrics.prototype.trackMongoDb = function trackMongoDb(mongodb, options) {
  var mongoDogStats = require('mongodb-datadog-stats'),
      defaultOptions = {
        metric: 'node.mongodb.query',
        statsClient: this.statsD
      };

  options = _.defaults(defaultOptions, options || {});

  // Install tracker
  mongoDogStats.install(mongodb, options);
};


// Setup dependencies
di.annotate(Metrics, new di.Inject(Config, Logger, StatsD));


// Export our service
module.exports = Metrics;

'use strict';


var di = require('di'),
    _ = require('lodash'),
    moment = require('moment'),
    Logger = require('./logger'),
    Config = require('./config'),
    StatsD = require('./statsd'),
    UsherActivityPoller = require('usher/lib/activity/poller'),
    UsherDecisionPoller = require('usher/lib/decider/poller');


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
          route = (baseUrl + req.route.path).split('/');

      // Normalizing id's and removing ':' from the route
      route = route.map(function (part) {
        // Map named params to new syntax
        if (part.length > 1 && part.indexOf(':') === 0) {
          return '{' + part.substring(1) + '}';
        }

        // Baucis does not behave well with named routes
        if (part.match(/[0-9a-f]{64}/) || part.match(/[0-9a-f]{24}/)) {
          return '{id}';
        }

        return part;
      });

      route = route.join('/');
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
 * Inject stat tracking into usher
 */
Metrics.prototype.usher = function usher(options) {
  this.usherWorkflow(options);
  this.usherActivity(options);
};


/**
 * Inject stat tracking into usher workflows
 */
Metrics.prototype.usherWorkflow = function usherWorkflow(options) {

  if (!this.enabled) { return; }

  options = options || {};

  var self = this,
      statPrefix = options.stat || 'node.usher',
      originalTaskHandler = UsherDecisionPoller.prototype._onDecisionTask;

  statPrefix = statPrefix + '.workflow';

  UsherDecisionPoller.prototype._onDecisionTask = function metricsIntercept(task) {
    var start = new Date();

    var events = task.eventList._events,
        currentDecisionIndex = events.length - 1,
        originalResponseHandler = task.response.respondCompleted,
        statTags = [
          'domain:' + this.domain,
          'name:' + task.config.workflowType.name,
          'version:' + task.config.workflowType.version
        ];

    var lastDecisionIndex = _.findLastIndex(events, function (event, index) {
      return index < currentDecisionIndex && event.eventType === 'DecisionTaskStarted';
    });

    // Extract only the events that have happened since the last time a decision was made
    var newEvents = events.slice(lastDecisionIndex);

    // Find the name / version for the original start event for a given completion event
    function findMetadataForEndEvent(endEvent, events) {
      var attr = _.lowerFirst(endEvent.eventType) + 'EventAttributes',
          beginEventId = endEvent[attr].scheduledEventId || endEvent[attr].initiatedEventId,
          beginEvent = events[beginEventId - 1],
          metadata = beginEvent[_.lowerFirst(beginEvent.eventType) + 'EventAttributes'],
          name = _.get(metadata, 'activityType.name') || _.get(metadata, 'workflowType.name') || metadata.name,
          version = _.get(metadata, 'activityType.version') || _.get(metadata, 'workflowType.version') || 'HEAD';
      return {
        name: name,
        version: version
      };
    }

    // Find string match
    function contains(eventType, markers) {
      return _.find(markers, function (search) {
        return eventType.indexOf(search) > -1;
      });
    }

    // Track some stats for all the events since our last decision was made
    _.forEach(newEvents, function (event) {
      var eventState = contains(event.eventType, ['Started', 'Completed', 'Failed', 'TimedOut', 'Canceled', 'Terminated']),
          eventSubject = contains(event.eventType, ['ChildWorkflowExecution', 'ActivityTask', 'LambdaFunction']);

      // We only track some state changes for some event subjects
      if (!eventState || !eventSubject) {
        return;
      }

      // Track a counter for each event type
      var tags = ['type:' + eventSubject, 'state:' + _.camelCase(eventState)].concat(statTags);
      self.statsD.increment(statPrefix + '.decision', tags);

      // We don't trackin anything else for started events
      if (eventState === 'Started') {
        return;
      }

      var attr = _.lowerFirst(event.eventType) + 'EventAttributes',
          startEvent = events[event[attr].startedEventId - 1],
          startTime = moment(startEvent.eventTimestamp),
          endTime = moment(event.eventTimestamp),
          metadata = findMetadataForEndEvent(event, events);

      // Track all the stuffs
      self.statsD.histogram(
        statPrefix + '.task_execution_time',
        endTime.diff(startTime), 1,
        ['name:' + metadata.name, 'version:' + metadata.version].concat(tags));
    });

    // Intercept decision response so we can track it's execution time
    task.response.respondCompleted = function metricsCompleteInterceptor(decisions, cb) {
      // Log some stats with datadog
      self.statsD.histogram(statPrefix + '.decision_time', (new Date() - start), 1, statTags);

      // Call original response handler
      originalResponseHandler.call(this, decisions, cb);
    };

    // Execute the original handler
    originalTaskHandler.call(this, task);
  };
};


/**
 * Inject stat tracking into usher activities
 */
Metrics.prototype.usherActivity = function usherActivity(options) {

  if (!this.enabled) { return; }

  options = options || {};

  var self = this,
      statPrefix = options.stat || 'node.usher',
      originalTaskHandler = UsherActivityPoller.prototype._onActivityTask;

  statPrefix = statPrefix + '.activity';

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

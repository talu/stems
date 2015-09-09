'use strict';


var di = require('di'),
  Analytics = require('analytics-node'),
  Config = require('./config'),
  Logger = require('./logger');


var Segment = function Segment(config, logger) {
  var segmentConfig = config.get('segmentio');
  this.logger = logger;
  this.analytics = new Analytics(segmentConfig.writeKey, segmentConfig.options || {});
};


Segment.prototype.identify = function (payload, done) {
  var self = this;
  done = done || function () {};

  this.logger.log('debug', 'Identifying segment user: ', payload);
  this.analytics.identify(payload, function (err, batch) {
    if (err) {
      self.logger.log('warn', 'Failed to send identify event: %s to segment due to: ', payload, err);
    } else {
      self.logger.log('debug', 'Sent segment identify for: %s in batch: ', payload.userId, batch);
    }

    done(err, batch);
  });
};

Segment.prototype.track = function (payload, done) {
  var self = this;
  done = done || function () {};

  this.logger.log('debug', 'Tracking segment event: ', payload);
  this.analytics.track(payload, function (err, batch) {
    if (err) {
      self.logger.log('warn', 'Failed to send track event: %s to segment due to: ', payload, err);
    } else {
      self.logger.log('debug', 'Sent segment event: %s for: %s in batch: ', payload.event, payload.userId, batch);
    }

    done(err, batch);
  });
};


// Setup dependencies
di.annotate(Segment, new di.Inject(Config, Logger));


// Export our service
module.exports = Segment;

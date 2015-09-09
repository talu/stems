'use strict';

var crypto = require('crypto'),
  ActivityTask = require('usher/lib/activity/task');

function ActivityRunner() {
  var self = this;
  return function (activity, input, done) {
    activity(self.getTask(input, done));
  };
}

// Get task
ActivityRunner.prototype.getTask = function (input, done) {
  return new ActivityTask({
    config: {
      input: JSON.stringify(input),
      activityId: crypto.pseudoRandomBytes(12).toString('base64'),
      activityType: {
        name: 'activity-name',
        version: '1.0.0'
      }
    },
    respondCompleted: function (response, cb) {
      done(null, response);
      cb();
    },
    respondFailed: function (response, details, cb) {
      done(details);
      cb();
    }
  });
};

module.exports = ActivityRunner;


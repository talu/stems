'use strict';

var RawDecisionTask = require('aws-swf').DecisionTask,
    crypto = require('crypto');

function DecisionTask(name, version, events, done) {
  // A mock SWF client to capture the decisions made by a workflow
  var mockClient = {
    respondDecisionTaskCompleted: function (response, cb) {
      done(null, response.decisions);
      // cb(null, {});
    }
  };

  // A fake config
  var config = {
    workflowType: {
      name: name,
      version: version
    },
    taskToken: crypto.pseudoRandomBytes(12).toString('base64'),
    events: events
  };

  return new RawDecisionTask(config, mockClient);
}

module.exports = DecisionTask;

'use strict';

var DecisionTask = require('./decision-task');

function WorkflowRunner() {
  return function (workflow, version, events, done) {
    workflow._onDecisionTask(new DecisionTask(workflow.name, version, events, done));
  };
}

module.exports = WorkflowRunner;

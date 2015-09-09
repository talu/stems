'use strict';

var
  di = require('di'),
  sinon = require('sinon'),
  Mongoose = require('../../services/mongoose');

function MongooseMock() {
  this.models = {};
}

MongooseMock.prototype.connection = {
  on: function () {}
};

MongooseMock.prototype.model = function (name) {
  if (!this.models[name]) {
    this.models[name] = sinon.stub();
  }

  return this.models[name];
};


di.annotate(MongooseMock, new di.Provide(Mongoose));

module.exports = MongooseMock;

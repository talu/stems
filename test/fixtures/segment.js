'use strict';

var
  di = require('di'),
  sinon = require('sinon'),
  Segment = require('../../services/segment');

function SegmentMock() {
  return {
    identify: sinon.stub(),
    track: sinon.stub(),
    alias: sinon.stub(),
    page: sinon.stub()
  };
}


di.annotate(SegmentMock, new di.Provide(Segment));

module.exports = SegmentMock;

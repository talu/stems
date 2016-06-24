'use strict';

var
  di = require('di'),
  fixtures = require('../fixtures');

before(function () {
  fixtures._injector = fixtures._injector || new di.Injector([fixtures.TestLogger, fixtures.SegmentMock]);
});

'use strict';

var
  _ = require('lodash'),
  expect = require('chai').expect,
  sinon = require('sinon'),
  fixtures = require('../../../fixtures'),
  BaucisPermissions = require('../../../../middleware/baucis/permissions');

describe('Middleware - BaucisPermissions', function () {

  function next() {
    continued = true;
  }

  var
    req,
    res = {
      sendStatus: function (status) {
        response = status;
      }
    },
    baucisPermissions,
    continued,
    response;

  beforeEach(function () {
    baucisPermissions = fixtures._injector.get(BaucisPermissions);
    req = {};
    continued = false;
    response = undefined;
  });

  context('#hasPermission', function () {
    var
      targets,
      middleware;

    beforeEach(function () {
      targets = undefined;
      sinon.stub(baucisPermissions.permissions, 'checkPermission', function (subject, cb) {
        return function () { return cb(req, targets) };
      });
      middleware = baucisPermissions.hasPermission('User');
    });

    afterEach(function () {
      baucisPermissions.permissions.checkPermission.restore();
    });

    it('should always pass if target subject permission is set to `true`', function () {
      targets = true;
      expect(middleware(req, res, next)).to.be.true;
    });

    it('should always fail if target subject permission is set to `false`', function () {
      targets = false;
      expect(middleware(req, res, next)).to.be.false;
    });

    it('should let custom function decide if target subject permission is a function`', function () {
      targets = function customFn() {
        return 'true';
      };
      expect(middleware(req, res, next)).to.equal('true');
    });

    it('should find subject id in array if target subject permission is an Array', function () {
      _.set(req, 'baucis.conditions._id', 'thisuserid');
      targets = [
        'something',
        'thisuserid',
        'anotheruserid'
      ];
      expect(middleware(req, res, next)).to.be.true;
    });
  });

  context('#limitResults', function () {
    var
      targets,
      middleware;

    beforeEach(function () {
      targets = undefined;
      sinon.stub(baucisPermissions.permissions, 'checkPermission', function (subject, cb) {
        return function () { return cb(req, targets) };
      });
      middleware = baucisPermissions.limitResults('User');
      _.set(req, 'baucis.query.where', sinon.spy());
    });

    afterEach(function () {
      baucisPermissions.permissions.checkPermission.restore();
    });

    it('should always pass if target subject permission is set to `true`', function () {
      targets = true;
      expect(middleware(req, res, next)).to.be.true;
    });

    it('should always fail if target subject permission is set to `false`', function () {
      targets = false;
      expect(middleware(req, res, next)).to.be.false;
    });

    it('should let custom function decide if target subject permission is a function`', function () {
      targets = sinon.spy();
      expect(middleware(req, res, next)).to.be.true;
      expect(targets.called).to.equal(true);
    });

    it('should find subject id in array if target subject permission is an Array', function () {
      _.set(req, 'baucis.conditions._id', 'thisuserid');
      targets = [
        'something',
        'thisuserid',
        'anotheruserid'
      ];
      expect(middleware(req, res, next)).to.be.true;
      expect(_.get(req, 'baucis.query.where.called')).to.equal(true);
    });
  });

});

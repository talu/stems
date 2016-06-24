'use strict';

var
  _ = require('lodash'),
  expect = require('chai').expect,
  sinon = require('sinon'),
  fixtures = require('../../fixtures'),
  Permissions = require('../../../middleware/permissions');

describe('Middleware - Permissions', function () {

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
    permissions,
    continued,
    response;

  beforeEach(function () {
    permissions = fixtures._injector.get(Permissions);
    req = {};
    continued = false;
    response = undefined;
  });

  context('#hasPermission', function () {
    var targets;

    beforeEach(function () {
      targets = undefined;
      sinon.stub(permissions, 'checkPermission', function (subject, cb) {
        return cb(req, targets);
      });
    });

    afterEach(function () {
      permissions.checkPermission.restore();
    });

    it('should always pass if target subject permission is set to `true`', function () {
      targets = true;
      expect(permissions.hasPermission('User')).to.be.true;
    });

    it('should always fail if target subject permission is set to `false`', function () {
      targets = false;
      expect(permissions.hasPermission('User')).to.be.false;
    });

    it('should let custom function decide if target subject permission is a function`', function () {
      targets = function customFn() {
        return 'true';
      };
      expect(permissions.hasPermission('User')).to.equal('true');
    });

    it('should find subject id in array if target subject permission is an Array', function () {
      _.set(req, 'params.userId', 'thisuserid');
      targets = [
        'something',
        'thisuserid',
        'anotheruserid'
      ];
      expect(permissions.hasPermission('User', 'userId')).to.be.true;
    });
  });

  context('#normalizePermission', function () {

    it('should not affect Booleans', function () {
      expect(permissions.normalizePermission(true)).to.equal(true);
      expect(permissions.normalizePermission(false)).to.equal(false);
    });

    it('should not affect Arrays', function () {
      var perm = ['something', 'somethingelse'];
      expect(permissions.normalizePermission(perm)).to.equal(perm);
    });

    it('should not affect Functions', function () {
      var perm = function () { return 'nothing'; };
      expect(permissions.normalizePermission(perm)).to.equal(perm);
    });

    it('should convert any unsupported permission into an array', function () {
      var
        perm1 = 'something',
        perm2 = { test: 'something' };
      expect(permissions.normalizePermission(perm1)).to.eql([perm1]);
      expect(permissions.normalizePermission(perm2)).to.eql([perm2]);
    });

  });

  context('#checkPermission', function () {
    var middleware;

    beforeEach(function () {
      middleware = permissions.checkPermission('User', _.noop);
    });

    it('should continue if no permission config is found in request', function () {
      _.set(req, 'authInfo.permissions', false);
      middleware(req, res, next);
      expect(continued).to.be.true;
    });

    it('should respond with 403 if method is of type \'read\' but \'read\' permission config doesn\'t exist', function () {
      _.set(req, 'method', 'OPTIONS');
      _.set(req, 'authInfo.permissions', {
        write: true
      });
      middleware(req, res, next);
      expect(continued).to.be.false;
      expect(response).to.equal(403);
    });

    it('should continue if \'read\' permission config is set to true', function () {
      _.set(req, 'method', 'OPTIONS');
      _.set(req, 'authInfo.permissions', {
        read: true
      });
      middleware(req, res, next);
      expect(continued).to.be.true;
    });

    it('should continue if \'write\' permission config is set to true', function () {
      _.set(req, 'method', 'POST');
      _.set(req, 'authInfo.permissions', {
        write: true
      });
      middleware(req, res, next);
      expect(continued).to.be.true;
    });

    it('should continue if permission config is set to an asterisk', function () {
      _.set(req, 'method', 'POST');
      _.set(req, 'authInfo.permissions', {
        write: '*'
      });
      middleware(req, res, next);
      expect(continued).to.be.true;
    });

    it('should respond with 403 if permission config is set but target subject is not', function () {
      _.set(req, 'method', 'POST');
      _.set(req, 'authInfo.permissions', {
        write: {
          'Client': 'someclientid' // Middleware is looking for subject: 'User'
        }
      });
      middleware(req, res, next);
      expect(continued).to.be.false;
      expect(response).to.equal(403);
    });

    it('should respond with 403 if permission config is set but fails to validate', function () {
      _.set(req, 'method', 'POST');
      _.set(req, 'authInfo.permissions', {
        write: {
          'User': 'someuserid'
        }
      });
      var middleware2 = permissions.checkPermission('User', function failValidation() {
        return false;
      });
      middleware2(req, res, next);
      expect(continued).to.be.false;
      expect(response).to.equal(403);
    });

    it('should continue if permission config is set and passes validation', function () {
      _.set(req, 'method', 'GET');
      _.set(req, 'authInfo.permissions', {
        read: {
          'User': 'someuserid'
        }
      });
      var middleware2 = permissions.checkPermission('User', function passValidation() {
        return true;
      });
      middleware2(req, res, next);
      expect(continued).to.be.true;
    });

  });
});

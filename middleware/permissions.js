'use strict';


var _ = require('lodash');


var Permissions = function Permissions() {};


/**
 * # Ensure that the user has the permission for a given subject
 */
Permissions.prototype.hasPermission = function hasPermission(subject, idPath) {
  return this.checkPermission(subject, function (req, targets) {
    var subjectId = _.get(req.params, idPath);

    // Only proceed if subject id is in the list of authorized ID's
    if (_.includes(targets, subjectId)) {
      return true;
    }

    return false;
  });
};


/**
 * # Ensure that the user belongs to at least one of the required roles
 */
Permissions.prototype.hasRole = function hasRole(roleNames) {
  return function checkRole(req, res, next) {

    function reject() {
      res.sendStatus(403);
    }

    var roles = _.get(req, 'authInfo.roles');

    // If no roles defined, we default to `allow`
    if (!roles) {
      return next();
    }

    // Normalize the input into an array
    roleNames = _.isArray(roleNames) ? roleNames : [roleNames];

    // Check to see if they have at least one of the requested roles
    var intersection = _.intersection(roles, roleNames);
    if (intersection && intersection.length > 0) {
      return next();
    }

    // All else fails, we reject them
    reject();
  };
};


Permissions.prototype.checkPermission = function checkPermission(subject, validateFn) {
  return function restrict(req, res, next) {

    function reject() {
      res.sendStatus(403);
    }

    var permissions = _.get(req, 'authInfo.permissions');

    // If no permissions defined, we default to `allow`
    if (!permissions) {
      return next();
    }

    var method = _.get(req, 'method'),
        isRead = _.includes(['GET', 'HEAD', 'OPTIONS'], method.toUpperCase()),
        checkedPermissions = _.get(permissions, isRead ? 'read' : 'write');

    // Given permissions are enabled, if either read/write access is not present we deny the request
    if (!checkedPermissions) {
      return reject();
    }

    // Check if there is a global allow for read/write
    if (checkedPermissions === '*' || checkedPermissions === true) {
      return next();
    }

    // Since we did not have a global allow, now check to see if the subject is defined in the permission list
    if (subject && _.has(checkedPermissions, subject)) {
      var restrictions = _.get(checkedPermissions, subject);
      restrictions = _.isArray(restrictions) ? restrictions : [restrictions];

      // Since our request is for a subject with restrictions, we now validate if we have access to the subject
      var targets = _.map(restrictions, function (item) {
        return _.isString(item) ? item : _.get(item, 'id');
      });

      if (validateFn(req, targets)) {
        return next();
      }

    }

    // All else fails, we reject them
    reject();
  };
};


module.exports = Permissions;

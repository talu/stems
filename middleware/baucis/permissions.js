/*!
 * Stems
 * Copyright(c) 2016 Meltmedia <mike@meltmedia.com>
 */

'use strict';


var di = require('di'),
    _ = require('lodash'),
    Logger = require('stems/services/logger'),
    Permissions = require('../permissions');


var BaucisPermissions = function BaucisPermissions(logger, permissions) {
  this.logger = logger;
  this.permissions = permissions;
};

/**
 * # Limit the results of a query to only models we have permission for
 */
BaucisPermissions.prototype.limitResults = function limitResults() {
  var self = this;

  return function validate(req, res, next) {
    var subject = _.get(req, 'baucis.query.model.modelName'),
        validatePermission = self.permissions.checkPermission(subject, function (req, targets) {
          if (_.isFunction(targets)) {
            targets.call(null, req, subject);
            return true;
          }

          req.baucis.query.where('_id', { $in: targets });
          return true;
        });

    validatePermission(req, res, next);
  };
};

/**
 * # Ensure that the user has the required permissions for the current baucis model / method
 */
BaucisPermissions.prototype.hasPermission = function hasPermission(subject) {
  var self = this;

  return function validate(req, res, next) {
    var validatePermission = self.permissions.checkPermission(subject, function (req, targets) {
      // If the check is a custom function, let it determine the validity
      if (_.isFunction(targets)) {
        return targets.call(null, req, subject);
      }

      // Check for _id conditions
      var idCondition = _.get(req, 'baucis.conditions._id');
      if (idCondition && _.isString(idCondition)) {
        // Only proceed if subject id is in the list of authorized ID's
        return _.includes(targets, idCondition);
      }

      // If set, this should always be a string. Recording states where it's not
      if (idCondition) {
        self.logger.log('error', `Unsure how to handle Baucis ID conditions for: ${idCondition}`);
        return false;
      }

      return true;
    });

    validatePermission(req, res, next);
  };
};


// Setup dependencies
di.annotate(BaucisPermissions, new di.Inject(Logger, Permissions));


module.exports = BaucisPermissions;

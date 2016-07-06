/*!
 * Stems
 * Copyright(c) 2016 Meltmedia <mike@meltmedia.com>
 */

'use strict';


var di = require('di'),
    _ = require('lodash'),
    through = require('through'),
    Logger = require('../../services/logger'),
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

          // If targets is absolute, act accordingly
          if (_.isBoolean(targets)) {
            return targets;
          }

          if (_.isFunction(targets)) {
            targets.call(null, req, subject);
            return true;
          }

          req.baucis.query.where('_id', { $in: targets });
          return true;
        });

    return validatePermission(req, res, next);
  };
};

/**
 * # Ensure that the user has the required permissions for the current baucis model / method
 */
BaucisPermissions.prototype.hasPermission = function hasPermission(subject) {
  var self = this;

  return function validate(req, res, next) {
    var restrictedSubjects = _.get(req, 'authInfo.permissions.read');

    // Permission handler
    var validatePermission = self.permissions.checkPermission(subject, function (req, targets) {

      // Install a outgoing handler to prune restricted data from any results
      req.baucis.outgoing(through(function (context) {
        var model = _.get(req, 'baucis.query.model'),
            paths = _.get(model, 'schema.paths');

        // Evaluate each path in the current model to see if it references restricted data
        _.forEach(paths, function (params, path) {
          var ref = _.get(params, 'options.ref') || _.get(params, 'caster.options.ref'),
              restrictions = _.get(restrictedSubjects, ref);

          // If a given path has restrictions associated, filter out any unauthorized results
          if (restrictions) {

            // Normalize the list of restrictions to be an array
            restrictions = _.isFunction(restrictions) ? [] : restrictions;
            restrictions = _.isArray(restrictions) ? restrictions : [restrictions];
            restrictions = _.map(restrictions, function (item) { return item.toString(); });

            // Pull the value found at the restricted path
            var contextAtPath = _.get(context.doc, path);

            // If the value at the path is an array, we will make sure it only contains values also found in the list of restrictions.
            if (_.isArray(contextAtPath)) {
              var intersection = _.reduce(contextAtPath, function (result, item) {
                if (_.includes(restrictions, item.toString())) {
                  result.push(item);
                }
                return result;
              }, []);
              _.set(context.doc, path, intersection);

            // If the value at the path is not found in the list of restrictions, we strike it from the results
            } else if (!_.includes(restrictions, contextAtPath.toString())) {
              _.set(context.doc, path, undefined);
            }
          }
        });

        this.queue(context);
      }));


      // If targets is absolute, act accordingly
      if (_.isBoolean(targets)) {
        return targets;
      }

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

    return validatePermission(req, res, next);
  };
};


// Setup dependencies
di.annotate(BaucisPermissions, new di.Inject(Logger, Permissions));


module.exports = BaucisPermissions;

/*!
 * Stems
 * Copyright(c) 2016 Meltmedia <mike@meltmedia.com>
 */

'use strict';


var _ = require('lodash');


/**
 * # Limit the selection query based on the supplied limits
 */
var Limit = function Limit() {

  return function limitConfig(limits) {
    return function limit(req, res, next) {
      _.each(limits, (criteria, field) => {
        var condition = _.isObject(criteria) ? criteria : _.get(req, criteria);
        req.baucis.query.where(field, condition);
      });
      next();
    };
  };

};


module.exports = Limit;

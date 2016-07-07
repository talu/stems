/*!
 * Stems
 * Copyright(c) 2016 Meltmedia <mike@meltmedia.com>
 */

'use strict';

var through = require('through'),
    _ = require('lodash');

/**
 * # Strip outgoing fields from being serialized
 */
var Strip = function Strip() {

  return function stripConfig(fields) {

    return function strip(req, res, next) {

      req.baucis.outgoing(through(function (context) {

        _.each(fields, (field) => {
          if (context.doc[field]) {
            context.doc[field] = undefined;
          }
        });

        this.queue(context);

      }));

      next();
    };
  };
};


module.exports = Strip;

/*!
 * Stems
 * Copyright(c) 2016 Meltmedia <mike@meltmedia.com>
 */

'use strict';

var through = require('through'),
    _ = require('lodash');

/**
 * # Prune incoming fields from being set on the document
 */
var Prune = function Prune() {

  return function pruneConfig(fields) {

    return function prune(req, res, next) {

      req.baucis.incoming(through(function (doc) {

        _.each(fields, (field) => {
          if (doc.incoming[field]) {
            delete doc.incoming[field];
          }
        });

        // Done with the doc, pass it along to the next handler
        this.queue(doc);
      }));

      next();
    };
  };
};


module.exports = Prune;

/*!
 * Stems
 * Copyright(c) 2016 Meltmedia <mike@meltmedia.com>
 */

'use strict';

var through = require('through'),
    _ = require('lodash');

/**
 * # Map incoming fields to new field on the document
 */
var Mapping = function Mapping() {

  return function mapping(mappings) {

    return function map(req, res, next) {

      req.baucis.incoming(through((doc) => {

        _.each(mappings, (destination, source) => {
          if (req.body[source]) {
            doc.incoming[destination] = req.body[source];
          }
        });

        // Done with the doc, pass it along to the next handler
        this.queue(doc);
      }));

      next();
    };
  };
};


module.exports = Mapping;

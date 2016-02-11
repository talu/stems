/*!
 * Stems
 * Copyright(c) 2016 Meltmedia <mike@meltmedia.com>
 */

'use strict';

var through = require('through'),
    _ = require('lodash');

const UPDATE_OPERATORS = ['$set', '$unset', '$push', '$pull', '$addToSet', '$pop', '$pushAll', '$pullAll'];


/**
 * # Map incoming fields to new field on the document
 */
var Mapping = function Mapping() {

  return function mapping(mappings) {

    return function map(req, res, next) {

      // If using the baucis 'update-operator' header, we skip any payload manipulation
      if (UPDATE_OPERATORS.indexOf(req.headers['update-operator']) > -1) {
        return next();
      }

      req.baucis.incoming(through(function (doc) {

        _.each(mappings, (destination, source) => {
          if (_.get(req, source)) {
            doc.incoming[destination] = _.get(req, source);
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

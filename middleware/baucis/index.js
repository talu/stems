'use strict';


var di = require('di'),
    Limit = require('./limit'),
    Mapping = require('./map'),
    Prune = require('./prune'),
    Strip = require('./strip'),
    Permissions = require('./permissions'),
    Reject = require('./reject');


var BaucisMiddleware = function BaucisMiddleware(limit, map, prune, strip, permissions, reject) {

  // Limit queries based on a set of criteria
  this.limit = limit;

  // Map incoming params to document specific params
  this.map = map;

  // Prune incoming fields
  this.prune = prune;

  // Strip outgoing fields
  this.strip = strip;

  // Prune incoming fields
  this.permissions = permissions;

  // Reject a request with a 405
  this.reject = reject;

};


// Setup dependencies
di.annotate(BaucisMiddleware, new di.Inject(Limit, Mapping, Prune, Strip, Permissions, Reject));


// Export our service
module.exports = BaucisMiddleware;

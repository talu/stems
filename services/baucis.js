'use strict';


var Baucis = function() {

  require('baucis-vivify'); // Enable vivify in baucis
  this.baucis = require('baucis'); // Ensure baucis can decorate mongoose models

};

Baucis.prototype.newInstance = function () {
  this.baucis.empty(); // Reset baucis
  return this.baucis();
}


// Export our service
module.exports = Baucis;

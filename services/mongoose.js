'use strict';


var di = require('di'),
    mongoose = require('mongoose'),
    Config = require('./config');


var Mongoose = function(config) {

  require('baucis-vivify'); // Enable vivify in baucis
  require('baucis'); // Ensure baucis can decorate mongoose models

  // Establish a connection to Mongo
  if (!mongoose.connection.name) {
    mongoose.connect(config.get('mongodb:url'), config.get('mongodb:options'));
  }

  return mongoose;

};


// Setup dependencies
di.annotate(Mongoose, new di.Inject(Config));


// Export our service
module.exports = Mongoose;

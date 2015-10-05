'use strict';


var di = require('di'),
    mongoose = require('mongoose'),
    Baucis = require('./baucis'),
    Config = require('./config');


var Mongoose = function(config, baucis) {

  // Establish a connection to Mongo
  if (!mongoose.connection.name) {
    mongoose.connect(config.get('mongodb:url'), config.get('mongodb:options'));
  }

  return mongoose;

};


// Setup dependencies
di.annotate(Mongoose, new di.Inject(Config, Baucis));


// Export our service
module.exports = Mongoose;

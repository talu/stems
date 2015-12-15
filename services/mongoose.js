'use strict';


var di = require('di'),
    mongoose = require('mongoose'),
    Baucis = require('./baucis'),
    Metrics = require('./metrics'),
    Config = require('./config');


var Mongoose = function(config, baucis, metrics) {

  // Track mongodb query metrics
  metrics.trackMongoDb(mongoose);

  // Establish a connection to Mongo
  if (!mongoose.connection.name) {
    mongoose.connect(config.get('mongodb:url'), config.get('mongodb:options'));
  }

  return mongoose;

};


// Setup dependencies
di.annotate(Mongoose, new di.Inject(Config, Baucis, Metrics));


// Export our service
module.exports = Mongoose;

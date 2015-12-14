'use strict';


var di = require('di'),
    mongoose = require('mongoose'),
    mongodb = require('mongodb'),
    Baucis = require('./baucis'),
    Metrics = require('./metrics'),
    Config = require('./config');


var Mongoose = function(config, baucis, metrics) {

  // Establish a connection to Mongo
  if (!mongoose.connection.name) {
    mongoose.connect(config.get('mongodb:url'), config.get('mongodb:options'));
  }

  // Track mongodb query metrics
  metrics.trackMongoDb(mongodb);

  return mongoose;

};


// Setup dependencies
di.annotate(Mongoose, new di.Inject(Config, Baucis, Metrics));


// Export our service
module.exports = Mongoose;

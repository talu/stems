'use strict';


var di = require('di'),
    events = require('events'),
    util = require('util'),
    Mongoose = require('./mongoose'),
    Logger = require('./logger');


var Health = function(logger, mongoose) {

  var self = this;

  this.online = false; // By default, we are offline
  this.logger = logger;
  this.mongoose = mongoose;

  // Setup error handlers for connection issues
  mongoose.connection.on('error', function (err) {
    logger.log('error', 'An error occured on the database connection due to: ' + err);
  });

  // Log when we connect
  mongoose.connection.on('open', function () {
    logger.log('info', 'Connected to Mongo');
    self.markOnline();
  });

  // Log when we reconnect
  mongoose.connection.on('reconnected', function () {
    logger.log('info', 'Reconnected to Mongo');
    self.markOnline();
  });

  mongoose.connection.on('disconnected', function () {
    logger.log('warn', 'Disconnected from Mongo');
    self.markOffline();
  });

};


// Make an EventEmitter
util.inherits(Health, events.EventEmitter);


Health.prototype.markOnline = function () {
  if (!this.online) {
    this.online = true;
    this.emit('online');
  }
};


Health.prototype.markOffline = function () {
  if (this.online) {
    this.online = false;
    this.emit('offline');
  }
};


// Setup dependencies
di.annotate(Health, new di.Inject(Logger, Mongoose));


// Export our service
module.exports = Health;

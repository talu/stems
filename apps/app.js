'use strict';

var winston = require('winston'),
  _ = require('lodash'),
  express = require('express'),
  cors = require('cors'),
  minimatch = require('minimatch'),
  expressValidator = require('express-validator'),
  url = require('url'),
  compression = require('compression'),
  bodyParser = require('body-parser'),
  errorhandler = require('errorhandler'),
  helmet = require('helmet'),
  util = require('util'),
  events = require('events');


function App(config, logger, passport) {
  var self = this;

  events.EventEmitter.call(this);

  this.app = express();
  this.logger = logger;
  this.passport = passport;

  // Establish CORS whitelist matching filters
  this.corsWhitelist = [];
  if (this.config && this.config.cors && this.config.cors.whitelist) {
    this.corsWhitelist = _.map(this.config.cors.whitelist, function (match) {
      return minimatch.filter(match, { matchBase: true });
    });
  }

  // Request Logging
  var requestLogger = new (winston.Logger)({ transports: [ new (winston.transports.Console)({ colorize: true }) ]});
  this.app.use(require('winston-request-logger').create(requestLogger));

  // Compress our responses when appropriate
  this.app.use(compression());

  // This installs the passport middleware so we can authenticate using strategies
  // defined in `auth.js`
  if (this.passport) {
    this.app.use(this.passport.initialize());
  }

  // Configure CORS support
  // This supports configuration properties:
  // - `cors.allowAll`: (Boolean) Allows all CORS requests
  // - `cors.whitelist`: (Array) List of domains to allow CORS requests from
  this.app.use(cors({
    origin: function (origin, cb) {
      // Deny by default
      if (!origin || !self.config || !self.config.cors) {
        return cb(null, false);
      }

      // Allow all CORS request when `allowAll` is configured
      if (self.config.cors.allowAll) {
        return cb(null, true);
      }

      var originUrl = url.parse(origin);
      var valid = _.find(self.corsWhitelist, function (match) {
        return match(originUrl.hostname);
      });

      return cb(null, !!valid);
    },
    credentials: true
  }));

  this.app.use(bodyParser.json());
  this.app.use(bodyParser.urlencoded({ extended: true }));

  // Support robust request validation
  this.app.use(expressValidator());

  // Setup security best practices
  // See: https://github.com/evilpacket/helmet
  this.app.use(helmet());

  if (process.env.NODE_ENV === 'development') {
    this.app.use(errorhandler());
  }
}


// Make App an EventEmitter
util.inherits(App, events.EventEmitter);


App.prototype.listen = function listen() {
  // Start the API server
  this.logger.log('info', 'Application listening on http://0.0.0.0:%s', this.config.port);
  return this.app.listen(this.config.port);
};


// Export our service
module.exports = App;

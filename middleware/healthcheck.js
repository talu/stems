'use strict';


var di = require('di'),
    express = require('express'),
    Health = require('../services/health');


var Healthcheck = function Healthcheck(health) {

  var router = express.Router();

  router.get('/', function (req, res) {
    var status = health.online ? 200 : 500;
    return res.status(status).end();
  });

  return router;

};


// Setup dependencies
di.annotate(Healthcheck, new di.Inject(Health));


module.exports = Healthcheck;

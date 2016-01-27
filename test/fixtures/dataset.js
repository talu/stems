'use strict';


var di = require('di'),
    async = require('async'),
    _ = require('lodash'),
    Mongoose = require('../../services/mongoose');


function DatasetImporter(mongoose) {
  this.connection = mongoose.connection;
}


DatasetImporter.REFERENCE_KEY = '$ref';
DatasetImporter.DELIMITER = '-_-';


/**
 * # Wipe Database
 * For all configured models in mongoose, wipe the data and clear the indexes
 */
DatasetImporter.prototype.reset = function (done) {

  var resetModelFns = this.connection.modelNames()
    .map((k) => {
      return this.connection.model(k);
    })
    .map((model) => {
      return async.series.bind(null, [
        model.remove.bind(model),
        model.collection.dropAllIndexes.bind(model.collection)
      ]);
    });

  async.parallel(resetModelFns, done);
};


/**
 * # Load Data
 * For specified models, load data into database and associate mapped relationships
 */
DatasetImporter.prototype.load = function (data, done) {
  var cleanData = DatasetImporter._getCleanData(data),
      refData = DatasetImporter._getRefData(data);

  this._createRecords(cleanData, (err, importedData) => {
    if (err) {
      return done(err);
    }
    this._linkReferences(importedData, refData, done);
  });
};


//
//  Private Functions
//


/**
 * # Create Records
 * Create the raw objects for data being loaded using `Model.create`
 */
DatasetImporter.prototype._createRecords = function (data, done) {
  var db = this.connection;

  function importModel(modelName, done) {
    var records = data[modelName];
    var Model = db.model(modelName);
    Model.create(records, function (err, results) {
      if (err) {
        return done(err);
      }

      var createdRecords = {};
      createdRecords[modelName] = results;

      done(null, createdRecords);
    });
  }

  async.map(Object.keys(data), importModel, (err, results) => {
    if (err) {
      return done(err);
    }
    done(null, _.reduce(results, (result, item) => {
      return _.merge(result, item);
    }, {}));
  });
};


/**
 * # Create Reference Links
 * Creates reference links between newly created objects
 */
DatasetImporter.prototype._linkReferences = function (importedData, refData, done) {
  var updateModelFns = [];

  function getReferenceId(ref) {
    var parsedLink = ref.replace(/[\[\]]/g, DatasetImporter.DELIMITER),
        splitLink = _.compact(parsedLink.split(DatasetImporter.DELIMITER)),
        key = splitLink[0],
        index = parseInt(splitLink[1]);

    return importedData[key][index].id;
  }

  // Iterate over every Model type in the imported data
  _.each(importedData, (models, modelType) => {

    // For each Model type, we now iterate over each record created for that model type
    models.forEach((model, index) => {
      var modelRefs = refData[modelType][index];

      // For each record, we map it's referenced fields to their corresponding reports in the imported data
      _.each(modelRefs, (fieldRefs, field) => {
        var refs;

        if (_.isArray(fieldRefs)) {
          refs = fieldRefs.map((ref) => {
            return getReferenceId(ref);
          });
        } else {
          refs = getReferenceId(fieldRefs);
        }
        model.set(field, refs);
      });

      if (!_.isEmpty(modelRefs)) {
        updateModelFns.push(model.save.bind(model));
      }
    });
  });

  async.series(updateModelFns, (err) => {
    if (err) {
      return done(err);
    }
    done(null, importedData);
  });

};


// Get dereferenced data sutable for creating new objects with `Model.create`
DatasetImporter._getCleanData = function (data) {
  var cleanData = {};
  _.each(data, function (arr, key) {
    cleanData[key] = _.map(arr, function (datum) {
      return _.omit(datum, [DatasetImporter.REFERENCE_KEY]);
    });
  });
  return cleanData;
};


// Get reference data for each model
DatasetImporter._getRefData = function (data) {
  var refData = {};
  _.each(data, function (arr, key) {
    refData[key] = _.map(arr, function (datum) {
      return datum[DatasetImporter.REFERENCE_KEY] || {};
    });
  });
  return refData;
};


// Setup dependencies
di.annotate(DatasetImporter, new di.Inject(Mongoose));


module.exports = DatasetImporter;

'use strict';

/**
 * Dependencies
 */
var
  gulp = require('gulp'),
  gulpSequence = require('gulp-sequence'),
  gulpMocha = require('gulp-mocha'),
  gulpJshint = require('gulp-jshint');

/**
 * Variables
 */
var
  paths = {
    lint: [
      './apps/**/**.js',
      './middleware/**/**.js',
      './services/**/**.js',
      './test/**/**.js',
      './gulpfile.js'
    ],
    tests: {
      unit: [
        './test/**/*.js'
      ]
    }
  };

/**
 * Checks JS against JSHint. Uses .jshintrc in root directory
 *
 * @task lint
 */
gulp.task('lint', function () {
  return gulp.src(paths.lint)
    .pipe(gulpJshint('.jshintrc'))
    .pipe(gulpJshint.reporter('jshint-stylish'));
});

/**
 * Runs unit tests
 *
 * @task test:unit
 */
gulp.task('test:unit', function (cb) {
  gulp.src(paths.tests.unit)
    .pipe(gulpMocha())
    .on('end', cb);
});

/**
 * Runs tests
 *
 * @task test
 */
gulp.task('test', function (cb) {
  gulpSequence(
    'test:unit',
    cb
  );
});

var fs = require('fs')
var path = require('path')

var _ = require('lodash')
var jsonfile = require('jsonfile')
var async = require('async')
var urljoin = require('url-join')
var request = require('request')
var shell = require('shelljs')
var format = require('string-format')
format.extend(String.prototype)

var getLogger = require('binder-logging').getLogger
var utils = require('binder-utils')

var config = jsonfile.readFileSync(path.join(process.env['HOME'], '.binder/logging.conf'))

// TODO: update the elasticsearch mapping in a less hack-y way
// log a single message so that the mappings for dynamically-generated fields are created
function logFirstMessage (next) {
  var logger = getLogger('logging-service', config.logging)
  try {
    logger.error('this is a test message', { app: 'test-app' })
  } catch (err) {
    console.error('Could not generate the test error message -- logging server not responding')
  }
  // give the log message 2 seconds to propage through elasticsearch
  setTimeout(function () {
    return next(null)
  }, 5000)
}

// update the mapping for the app field, then recreate the index
function configureElasticsearch (next) {
  var esUrl = 'http://localhost:' + config.elasticsearch.port
  var indexUrl = urljoin(esUrl, 'binder-logs')
  request.get({
    url: indexUrl,
    json: true
  }, function (err, json) {
    if (err) return next(err)
    // we need to be able to do exact string search on the app name
    var mappings = json.body['binder-logs']
    var indexPath = 'mappings.logs.properties.app.index'
    // do not recreate the index unless necessary (only the first time Binder is initialized)
    if (_.get(mappings, indexPath) === 'not_analyzed') {
      return next(null)
    }
    _.set(mappings, indexPath, 'not_analyzed')
    request({
      url: indexUrl,
      method: 'DELETE'
    }, function (err, rsp) {
      if (err) return next(err)
      request({
        url: indexUrl,
        method: 'PUT',
        json: true,
        body: mappings
      }, function (err, rsp) {
        return next(err)
      })
    })
  })
}

async.series([
  logFirstMessage,
  configureElasticsearch
], function (err) {
  console.error(err)
  process.exit(1)
})

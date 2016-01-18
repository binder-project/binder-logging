var elasticsearch = require('elasticsearch')

// TODO remove this by adding JSONSchema validation
/**
 * Validates the elasticsearch components of a Binder logging configuration file
 *
 * Returns an Error object if the configuration is invalid
 *
 * @param {object} config - Binder logging configuration
 */
var validateConfig = function (config) {
  // TODO: implement this function
  return null
}

var getInstance = function (config, cb) {
  var error = validateConfig(config)
  
}

module.exports = getInstance

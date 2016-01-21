var path = require('path')
var fs = require('fs')

var winston = require('winston')
require('winston-logstash')

var configPath = path.join(__dirname, '../conf/example.json')
var defaultConfig = JSON.parse(fs.readFileSync(configPath))

// TODO add a JSON schema for the logging configuration file
/*
 * Validates the logstash component of a Binder logging configuration
 *
 * Returns an Error object if the configuration is invalid
 *
 * @param {object} config - Binder logging configuration
 */
var validateConfig = function (config) {
  // TODO implement this
  return null
}

/**
 * Returns an instance of the Binder logger (default config at ../conf/example.json)
 * @param {object} config - Binder logging configuration
 */
var getInstance = function (config) {
  if (!config) {
    config = defaultConfig
  }
  var error = validateConfig(config)
  if (error) {
    throw error
  }
  var logger = new (winston.Logger)({
    transports: [
      new (winston.transports.Logstash)({
        port: config.logstash.port,
        host: config.host,
        node_name: 'binder-logging'
      })
    ]
  })
  return logger
}

module.exports = getInstance

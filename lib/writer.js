var path = require('path')
var fs = require('fs')

var _ = require('lodash')
var winston = require('winston')
require('winston-logstash')

var confString = fs.readFileSync(path.join(process.env['HOME'], '.binder/logging.conf'), 'utf8')
var defaultConfig = JSON.parse(confString)

var loggers = {}

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
 * Returns an instance of the Binder logger
 * @param {string} module - name of the module getting a logger
 */
var getInstance = function (module) {
  var config = defaultConfig
  var error = validateConfig(config)
  if (error) {
    throw error
  }
  if (module in loggers) {
    return loggers[module]
  } else {
    var logger = new (winston.Logger)({
      rewriters: [
        function (level, msg, meta) {
          meta.module = module
          return meta
        }
      ],
      transports: [
        new (winston.transports.Logstash)({
          port: config.logstash.port,
          host: config.host,
          node_name: 'binder-logging'
        })
      ]
    })
    if (config.testing) {
      logger.add(winston.transports.Console)
    }
    loggers[module] = logger
    return logger
  }
}

var closeAll = function () {
  _.forEach(loggers, function (logger) {
    logger.close()
  })
}

process.on('exit', function () {
  closeAll()
})

module.exports = getInstance


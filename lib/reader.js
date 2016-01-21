var path = require('path')
var fs = require('fs')

var _ = require('lodash')
var es = require('event-stream')
var pump = require('pump')
var elasticsearch = require('elasticsearch')
var socketIO = require('socket.io-client')

var configPath = path.join(__dirname, '../conf/example.json')
var defaultConfig = JSON.parse(fs.readFileSync(configPath))

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

/**
 * Reads or streams Binder log messages, optionally for a specific application
 * @constructor
 */
function BinderLogReader (config) {
  this.config = config
  var staticLogsUrl = config.host + ':' + config.elasticsearch.port
  this.client = new elasticsearch.Client({
    host: staticLogsUrl,
    log: 'error'
  })
}

/**
 * Helper method for performing ElasticSearch queries
 * @param {object} params - query parameters
 */
BinderLogReader.prototype._query = function (params) {
  // TODO: add pagination
  var fullParams = {
    from: 0,
    size: 10000,
    method: 'XGET',
    index: 'binder-logs',
    type: 'logs',
    body: { query: { filtered: { filter: params } } }
  }
  return this.client.search(fullParams).then(function (resp) { return resp.hits.hits })
}

/**
 * Get all historical logs, optionally matching an app and optionally since a certain time
 * @param {object} opts - object optionally containing app name or start time
 */
BinderLogReader.prototype.getLogs = function (opts, cb) {
  var params = []
  if (opts.app) {
    params.push({ term: { app: opts.app } })
  }
  if (opts.before || opts.after) {
    params.push({ range: { '@timestamp': { gte: opts.after, lte: opts.before } } })
  }
  return this._query(params)
}

/**
 * Return an EventStream containing all log messages for a given app
 * @param {string} app - name of the app to receive events for
 */
BinderLogReader.prototype.streamLogs = function (opts) {
  var self = this
  var socketUrl = 'ws://' + this.config.host + ':' + this.config.streaming.port
  var WebSocketClient = require('websocket').client
  var socket = new WebSocketClient()
  var realtimeEvents = []
  var stream = es.through()
  
  socket.on('connect', function (conn) {

    // streamed messages are buffered while historical events are retrieved
    var enqueueRealtime = function (msg) {
      realtimeEvents.push(msg)
    }

    // streamed messages are immediately parsed as JSON
    var parseStream = es.through(function write(msg) {
      this.emit('data', JSON.parse(msg.utf8Data))
    })
    parseStream.on('error', function (err) {
      console.error(err)
      stream.destroy()
    })
    conn.on('message', function (msg) {
      parseStream.write(msg)
    })
    conn.on('error', function (err) {
      console.error(err)
      parseStream.destroy()
    })

    // initially, all streamed messages are enqueued
    parseStream.on('data', enqueueRealtime)

    // start receiving streaming messages
    conn.send(JSON.stringify({ type: 'subscribe-topic', topic: opts.app }))

    // fetch historical logs
    var lastTime = null
    self.getLogs({
      after: opts.after,
      app: opts.app
    }).then(function (logs) {
      _.forEach(logs.map(function (msg) { return msg._source }), function (msg) {
        lastTime = new Date(msg['@timestamp'])
        stream.push(msg)
      })
      _.forEach(realtimeEvents, function (event) {
        if (new Date(event['@timestamp']) > lastTime) {
          stream.push(event)
        }
      })
      var debug = es.through(function (data) {
        this.emit('data', data)
      })

      // once all historical/buffered streaming logs have been processed, just pump new events
      pump(parseStream, debug, stream)
      parseStream.removeListener(enqueueRealtime)
    }, function (err) {
      stream.push(err)
      stream.destroy()
    })
  })

  socket.connect(socketUrl)
  return stream
}

/**
 * Returns an instance of BinderLogReader
 * @param {object} config - BinderLogReader configuration options
 */
var getInstance = function (config) {
  if (!config) {
    config = defaultConfig
  }
  var error = validateConfig(config)
  if (error) {
  }
  return new BinderLogReader(config)
}

module.exports = getInstance

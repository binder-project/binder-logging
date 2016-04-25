var path = require('path')
var fs = require('fs')

var _ = require('lodash')
var es = require('event-stream')
var pump = require('pump')
var elasticsearch = require('elasticsearch')
var assign = require('object-assign')

var confString = fs.readFileSync(path.join(process.env['HOME'], '.binder/logging.conf'), 'utf8')
var defaultConfig = JSON.parse(confString)

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
function BinderLogReader () {
  this.config = defaultConfig
  var staticLogsUrl = this.config.host + ':' + this.config.elasticsearch.port
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
    body: {
      sort: [ { '@timestamp': 'asc' } ],
      query: { filtered: { filter: { and: params } } }
    }
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
 * @param {string} opts - options containing an app name and optionally a start time
 */
BinderLogReader.prototype.streamLogs = function (opts) {
  var self = this
  var host = this.config.host
  if (this.config.host.slice(0, 7) === 'http://') {
    host = host.slice(7)
  }
  var socketUrl = 'ws://' + host + ':' + this.config.streaming.port
  var WebSocketClient = require('websocket').w3cwebsocket
  var socket = new WebSocketClient(socketUrl)
  var stream = es.through()

  // streamed messages are immediately parsed as JSON
  var cleanup = function () {
    stream.destroy()
    socket.close()
  }

  // configure the JSON parsing through-stream
  var parseStream = es.through(function write (msg) {
    this.emit('data', JSON.parse(msg.data))
  })
  parseStream.pause()


  // configure the WebSocket connection
  socket.onmessage = function (msg) {
    parseStream.write(msg)
  }
  socket.onerror = function (err) {
    console.error(err)
    cleanup()
  }
  socket.onclose = function () {
    cleanup()
  }

  socket.onopen = function () {
    // start receiving/buffering streaming messages
    socket.send(JSON.stringify({ type: 'subscribe-topic', topic: opts.app }))

    // getLogs is delayed by 2000 ms to account for Elasticsearch's ~1s indexing time
    setTimeout(function () {
      // fetch historical logs
      self.getLogs({
        after: opts.after,
        app: opts.app
      }).then(function (logs) {
        var lastTime = null

        // buffers all streaming messages until all historical logs have been emitted
        var realtimeStream = es.through(function write (event) {
          if (new Date(event['@timestamp']) > lastTime) {
            this.emit('data', event)
          }
        })

        // streaming messages are parsed, buffered, then emitted
        pump(parseStream, realtimeStream, stream, function () {
          parseStream.destroy()
          realtimeStream.destroy()
        })

        // before parseStream is resumed, emit all historical logs
        _.forEach(logs.map(function (msg) { return msg._source }), function (msg) {
          lastTime = new Date(msg['@timestamp'])
          stream.push(msg)
        })
        parseStream.resume()
      }, function (err) {
        stream.write(err)
        stream.destroy()
      })
    }, 2000)
  }

  stream.pause()
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
  config = assign(defaultConfig, config)
  return new BinderLogReader(config)
}

module.exports = getInstance

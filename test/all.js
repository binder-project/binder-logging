var assert = require('assert')

var getReader = require('../lib/reader.js')
var getWriter = require('../lib/writer.js')

var startTime = Date.now()

describe('writer', function () {
  it('should write general logs', function (done) {
    var logger = getWriter()
    logger.error('this is an error message')
    done()
  })
  it('should write app-specific logs', function (done) {
    var logger = getWriter()
    logger.error('this is an error message', {app: 'binder-logging-test'})
    done()
  })
})

describe('reader', function () {
  it('should get all logs associated with a certain app', function (done) {
    var logReader = getReader()
    logReader.getLogs({ app: 'binder-logging-test' }).then(function (logs) {
      assert(logs.length >= 1)
    }).then(done, done)
  })
  it('should get zero messages associated with a certain app since now', function (done) {
    var logReader = getReader()
    logReader.getLogs({ app: 'binder-logging-test', since: new Date() }).then(function (logs) {
      assert.equal(logs.length, 0)
    }).then(done, done)
  })
  it('should get all messages for a certain app since the beginning of testing', function (done) {
    var logReader = getReader()
    logReader.getLogs({ app: 'binder-logging-test', since: startTime }).then(function (logs) {
      assert.equal(logs.length, 1)
    }).then(done, done)
  })
  it('should handle log streaming (with only historical data)', function (done) {
    var logReader = getReader()
    var stream = logReader.streamLogs('binder-logging-test')
    var msgs = []
    stream.on('data', function (data) {
      msgs.push(data)
      if (msgs.length === 1) {
        stream.destroy()
        done()
      }
    })
  })
  it('should handle combined historical/streaming logs', function (done) {
    var logReader = getReader()
    var logger = getWriter()
    var stream = logReader.streamLogs('binder-logging-test')
    var msgs = []
    stream.on('data', function (data) {
      msgs.push(data)
      if (msgs.length === 2) {
        stream.destroy()
        done()
      }
    })
    logger.error('this is the second message', {app: 'binder-logging-test'})
  })
})

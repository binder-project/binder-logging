var assert = require('assert')

var getReader = require('../lib/reader.js')
var getWriter = require('../lib/writer.js')

// values set after the writer tests
var startTime = null
var afterOneTime = null

describe('writer', function () {
  var logger = getWriter()

  it('should write general logs', function (done) {
    logger.error('this is an error message')
    done()
  })
  it('should write app-specific logs', function (done) {
    logger.error('this is an error message', {app: 'binder-logging-test'})
    done()
  })
})

describe('reader', function () {

  before(function (done) {
    this.timeout(5000)
    var logger = getWriter()
    startTime = (new Date()).toISOString()
    logger.error('this is an error message')
    // assume the message will be processed in one second
    setTimeout(function () {
      afterOneTime = (new Date()).toISOString()
      done()
    }, 2000)
  })

  it('should get all logs associated with a certain app', function (done) {
    var logReader = getReader()
    logReader.getLogs({ app: 'binder-logging-test' }).then(function (logs) {
      assert(logs.length >= 1)
    }).then(done, done)
  })
  it('should get zero messages associated with a certain app since now', function (done) {
    var logReader = getReader()
    var date = (new Date()).toISOString()
    logReader.getLogs({ app: 'binder-logging-test', after: date }).then(function (logs) {
      assert.equal(logs.length, 0)
    }).then(done, done)
  })
  it('should get one messages for a certain app in the test interval', function (done) {
    var logReader = getReader()
    logReader.getLogs({
      app: 'binder-logging-test',
      after: startTime,
      before: afterOneTime
    }).then(function (logs) {
      assert.equal(logs.length, 1)
    }).then(done, done)
  })
  it('should handle log streaming (with only historical data)', function (done) {
    var logReader = getReader()
    var stream = logReader.streamLogs({
      app: 'binder-logging-test',
      after: startTime
    })
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
    var stream = logReader.streamLogs({
      app: 'binder-logging-test',
      after: startTime
    })
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

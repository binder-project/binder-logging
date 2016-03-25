var assert = require('assert')

var getReader = require('../lib/reader.js')
var getWriter = require('../lib/writer.js')

// values set after the writer tests
var startTime = null
var afterOneTime = null

describe('writer', function () {
  var logger = getWriter()

  it('should write general logs', function (done) {
    logger.info('this is an info message')
    done()
  })

  it('should write app-specific logs', function (done) {
    logger.info('this is an info message', {app: 'binder-logging-test'})
    done()
  })
})

describe('reader', function () {

  before(function (done) {
    this.timeout(5000)
    var logger = getWriter()
    startTime = (new Date()).toISOString()
    logger.info('this is an info message', { app: 'binder-logging-test' })
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

  it('should get one message for a certain app in the test interval', function (done) {
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
    this.timeout(10000)
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
    stream.resume()
  })

  it('should handle combined historical/streaming logs', function (done) {
    this.timeout(10000)
    var logReader = getReader()
    var logger = getWriter()
    var stream = logReader.streamLogs({
      app: 'binder-logging-test',
      after: startTime
    })
    var msgs = []
    stream.on('data', function (data) {
      msgs.push(data)
    })
    stream.resume()
    logger.info('this is the second message', {app: 'binder-logging-test'})
    setTimeout(function () {
      logger.info('this is the third message', {app: 'binder-logging-test'})
    }, 3000)
    setTimeout(function () {
      stream.destroy()
      if (msgs.length === 3) {
        done()
      } else {
        done(new Error('wrong number of messages received: ' + msgs.length))
      }
    }, 5000)
  })

  it('should not receive streaming events from nonexistent apps', function (done) {
    this.timeout(10000)
    var logReader = getReader()
    var logger = getWriter()
    var stream = logReader.streamLogs({
      app: 'binder-logging-test-fake',
      after: startTime
    })
    var msgs = []
    stream.on('data', function (data) {
      msgs.push(data)
    })
    stream.resume()
    logger.info('this is the fourth message', {app: 'binder-logging-test'})
    setTimeout(function () {
      stream.destroy()
      if (msgs.length === 0) {
        done()
      } else {
        done(new Error('wrong number of messages received: ' + msgs.length))
      }
    }, 3000)
  })
})

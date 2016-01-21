var winston = require('winston')

var reader = require('./lib/reader.js')
var writer = require('./lib/writer.js')

module.exports = {
  getReader: reader,
  getLogger: writer
}

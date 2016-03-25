# binder-logging
Consistent logging reader/writer functions for all Node-based Binder modules

Takes a configuration file (the default version in `conf/example.main`) that specifies how to
 1. connect to a Logstash server for log writing
 2. connect to Elasticsearch/Kibana servers for log reading
 3. stream build logs from a websocket

The example configuration file included in the module has these defaults:
```
{
  "host": "localhost",
  "testing": true,
  "logstash": {
    "port": 8050,
    "configDir": "~/binder-control/services/logging/logstash/"
  },

  "elasticsearch": {
    "port": 8052,
    "dir": "/data/binder/elasticsearch"
  },

  "kibana": {
    "port": 8053
  },

  "streaming": {
    "port": 2121
  }
}
```
`binder-control` can launch Docker containers for Elasticsearch, Logstash and Kibana (with the same default values) through the `binder-control start-service logging` command. If you'd prefer to use existing logging infrastructure, specify the custom host/port in the config file. 

### install
```
npm install binder-logging
```

### reader
`lib/reader.js` contains functions that wrap Elasticsearch queries to make it simpler to search through Binder logs. If you'd prefer to monitor a realtime stream of build logs, the `streamLogs` function is available (which will connect to Logstash's WebSocket output).

#### api
##### `BinderLogReader.getLogs(opts, cb)` 
Get all historical logs, optionally matching an app name and optionally between before/after times
 - `app` string - app name to filter on
 - `before` string - ISO8601 GMT timestamp
 - `after` string - ISO8601 GMT timestamp
 - `cb` function - callback(err, msgs)

##### `BinderLogReader.streamLogs(opts)`
Stream logs for a given app (mandatory option), optionally since an `after` timestamp. Returns a through stream
- `app` string - app name to filter on
- `after` string - ISO8601 GMT timestamp

#### usage
```
var getReader = require('binder-logging/lib/reader')
var reader = getReader({ host: '<custom logging host>' })
```

### writer

#### usage
```
var getLogger = require('binder-logging/lib/writer')
var logger = getLogger('<logger name>')
logger.info('this is an info message')
```

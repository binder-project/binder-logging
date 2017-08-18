## :dash: :dash: **The Binder Project is moving to a [new repo](https://github.com/jupyterhub/binderhub).** :dash: :dash:

:books: Same functionality. Better performance for you. :books:

Over the past few months, we've been improving Binder's architecture and infrastructure. We're retiring this repo as it will no longer be actively developed. Future development will occur under the [JupyterHub](https://github.com/jupyterhub/) organization.

* All development of the Binder technology will occur in the [binderhub repo](https://github.com/jupyterhub/binderhub)
* Documentation for *users* will occur in the [jupyterhub binder repo](https://github.com/jupyterhub/binder) 
* All conversations and chat for users will occur in the [jupyterhub binder gitter channel](https://gitter.im/jupyterhub/binder)

Thanks for updating your bookmarked links.

## :dash: :dash: **The Binder Project is moving to a [new repo](https://github.com/jupyterhub/binderhub).** :dash: :dash:

---

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

If `testing` is enabled, the Winston logger will output to both Logstash and stdout (only Logstash otherwise).

### install
```
npm install binder-logging
```

### reader
`lib/reader.js` contains functions that wrap Elasticsearch queries to make it simpler to search through Binder logs. If you'd prefer to monitor a realtime stream of build logs, the `streamLogs` function is available (which will connect to Logstash's WebSocket output).

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
`lib/writer.js` exposes a `getInstance` function that will return a Winston logger given a logger name. This logger exposes the standard logging api (`logger.info`, `logger.error`, ...).

##### `getInstance(name)`
Returns a Winston logger that's connected to the Binder logging stack
- `name` string - logger name (one logger will be created per name, per process)

#### usage
```
var getLogger = require('binder-logging/lib/writer')
var logger = getLogger('<logger name>')
logger.info('this is an info message')
```

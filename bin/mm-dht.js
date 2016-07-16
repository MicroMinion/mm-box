var DHT = require('../index.js')
var winston = require('winston')
var path = require('path')
var mkdirp = require('mkdirp')
var kadfs = require('kad-fs')
var url = require('url')

/* STORAGE FUNCTIONS */

var storageDir = './data'

var createStore = function (name) {
  name = url.parse(name)
  if (name.protocol === 'file') {
    mkdirp.sync(name.pathname)
    return kadfs(name.pathname)
  } else {
    throw new Error('Unsupported storage location')
  }
}

/* LOGGER */

var logger = new winston.Logger({
  transports: [
    new winston.transports.Console({
      level: 'debug'
    })
  ]
})

/* PLATFORM STORE */

var platformStore

if (!process.env.PLATFORM_STORE) {
  mkdirp.sync(path.join(storageDir, 'platform'))
  platformStore = kadfs(path.join(storageDir, 'platform'))
} else {
  platformStore = createStore(process.env.PLATFORM_STORE)
}

/* DHT STORE */

var dhtStore

if (!process.env.DHT_STORE) {
  mkdirp.sync(path.join(storageDir, 'dht'))
  dhtStore = new kadfs(path.join(storageDir, 'dht'))
} else {
  dhtStore = createStore(process.env.DHT_STORE)
}

/* CONNECTION_INFO */

if (process.env.IP_ADDRESS && process.env.PORT) {
  var connectionInfo = [{
    transportType: 'udp',
    transportInfo: {
      address: process.env.IP_ADDRESS,
      port: process.env.PORT
    }
  }, {
    transportType: 'tcp',
    transportInfo: {
      address: process.env.IP_ADDRESS,
      port: process.env.PORT
    }
  }]
}

/* INITIALIZATION */

var dht = new DHT({
  logger: logger,
  platformStore: platformStore,
  dhtStore: dhtStore,
  connectionInfo: connectionInfo
})

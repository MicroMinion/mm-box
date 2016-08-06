var kadfs = require('kad-fs-thomas')
var path = require('path')
var mkdirp = require('mkdirp')
var kadfs = require('kad-fs-thomas')
var MemStore = require('kad-memstore-thomas')
var url = require('url')
var winston = require('winston')
var winstonWrapper = require('winston-meta-wrapper')
var Platform = require('mm-platform')
var MulticastDNS = require('mm-services-mdns')
var Kademlia = require('mm-services-kademlia')
var _ = require('lodash')
var Identity = require('./identity.js')

var Runtime = function (environment) {
  this._environment = environment
  this.logger = this._getLogger()
  this.connectionInfo = this._getConnectionInfo()
  this.identity = this._getIdentity()
  this.services = {}
}

/* STORAGE FUNCTIONS */

Runtime.prototype._getStore = function (storeName) {
  var envName = storeName.toUpperCase() + '_STORE'
  if (this._environment[envName]) {
    return createStore(this._environment[envName])
  } else if (this._environment.PERSISTENCE) {
    return createStore(this._environment.PERSISTENCE + '/' + storeName)
  } else {
    return new MemStore()
  }
}

Runtime.prototype._createStore = function (name) {
  name = url.parse(name)
  if (name.protocol === 'file:') {
    mkdirp.sync(name.pathname)
    return kadfs(name.pathname)
  } else {
    throw new Error('Unsupported storage location')
  }
}

/* LOGGER */

Runtime.prototype._getLogger = function () {
  var level = 'info'
  if (this._environment.DEBUG_LEVEL) {
    level = 'debug'
  }
  var logstash = false
  if (this._environment.LOGSTASH) {
    logstash = true
  }
  var logger = new winston.Logger({
    transports: [
      new winston.transports.Console({
        level: level,
        timestamp: true,
        logstash: logstash
      })
    ]
  })
  return winstonWrapper(logger)
}

/* CONNECTION_INFO */

Runtime.prototype._getConnectionInfo = function () {
  if (this._environment.PORT) {
    var connectionInfo = [{
      transportType: 'udp',
      transportInfo: {
        port: this._environment.PORT
      }
    }, {
      transportType: 'tcp',
      transportInfo: {
        port: this._environment.PORT
      }
    }]
    return connectionInfo
  }
}
/* IDENTITY */

Runtime.prototype._getIdentity = function () {
  if (this._environment.IDENTITY) {
    var identity = new Identity(this._environment.IDENTITY)
    return identity
  }
}

/* CREATE PLATFORM */

Runtime.prototype.createPlatform = function () {
  var self = this
  var platform = new Platform({
    storage: this._getStore('platform'),
    connectionInfo: this.connectionInfo,
    logger: this.logger,
    identity: this.identity
  })
  platform.on('ready', function () {
    platform._log.addMeta({
      node: platform.identity.getSignId()
    })
    self._createServices()
  })
  if (this.identity) {
    this.identity.setPlatform(platform)
  }
  this.platform = platform
}

/* CREATE SERVICES */

Runtime.prototype._createServices = function () {
  if (!this._environment.SERVICES) {
    this.logger.warn('No services defined')
    return
  }
  var services = this._environment.SERVICES.split(' ')
  if (_.has(services, 'mdns')) {
    this._createmDNS()
  }
  if (_.has(services, 'kademlia')) {
    this._createKademlia()
  }
}

Runtime.prototype._createmDNS = function () {
  this.services.mdns = new MulticastDNS({
    platform: this.platform,
    logger: this.logger
  })
}

Runtime.prototype._createKademlia = function (platform) {
  this.services.kademlia = new Kademlia({
    platform: this.platform,
    storage: this._getStore('kademlia'),
    logger: this.logger
  })
}

module.exports = Runtime

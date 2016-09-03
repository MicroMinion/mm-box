'use strict'
var _ = require('lodash')
var mkdirp = require('mkdirp')
var url = require('url')
var kadfs = require('kad-fs-thomas')
var MemStore = require('kad-memstore-thomas')
var winston = require('winston')
var winstonWrapper = require('winston-meta-wrapper')
var Platform = require('mm-platform')
var MulticastDNS = require('mm-services-mdns')
var Kademlia = require('mm-services-kademlia')
var ServiceManager = require('mm-services-manager')
var TenantService = require('mm-services-tenant')
var Flukso = require('mm-services-flukso')
var DevicesManager = require('mm-services-devices')
var StatusManager = require('mm-services-status')
var Events = require('mm-services-events')
var PouchDB = require('pouchdb')
var memdown = require('memdown')

var Identity = require('./identity.js')

var Runtime = function (environment) {
  this._environment = environment
  this.logger = this._getLogger()
  this.connectionInfo = this._getConnectionInfo()
  this.identity = this._getIdentity()
  this.services = {}
}

/* STORAGE FUNCTIONS */

Runtime.prototype._hasPersistence = function () {
  return _.has(this._environment, 'PERSISTENCE')
}

Runtime.prototype.appendToPersistence = function (suffix) {
  return this._environment.PERSISTENCE + '/' + suffix
}

Runtime.prototype._getKadStore = function (storeName) {
  var uri = this._getStoreURI(storeName)
  if (uri) {
    return this._createKadStore(uri)
  } else {
    return new MemStore()
  }
}

Runtime.prototype._getStoreURI = function (storeName) {
  var envName = storeName.toUpperCase() + '_STORE'
  if (this._environment[envName]) {
    return this._environment[envName]
  } else if (this._environment.PERSISTENCE) {
    return this._environment.PERSISTENCE + '/' + storeName
  }
}

Runtime.prototype._createKadStore = function (name) {
  name = url.parse(name)
  if (name.protocol === 'file:') {
    mkdirp.sync(name.pathname)
    return kadfs(name.pathname)
  } else {
    throw new Error('Unsupported storage location')
  }
}

Runtime.prototype._getPouchStore = function (storeName) {
  var uri = this._getStoreURI(storeName)
  if (uri) {
    return this._createPouchStore(uri)
  } else {
    return new PouchDB(storeName, {
      db: require('memdown')
    })
  }
}

Runtime.prototype._createPouchStore = function (uri) {
  var name = url.parse(uri)
  if (name.protocol === 'file:') {
    mkdirp.sync(name.pathname)
    return new PouchDB(name.pathname)
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
    storage: this._getKadStore('platform'),
    connectionInfo: this.connectionInfo,
    logger: this.logger,
    identity: this.identity
  })
  this.platform = platform
  platform.on('ready', function () {
    if (process.env.LOG_CONTEXT) {
      self.logger.addMeta({
        node: platform.identity.getBoxId()
      })
    }
    self._createServices()
  })
  if (this.identity) {
    this.identity.setPlatform(platform)
  }
}

/* CREATE SERVICES */

Runtime.prototype._createServices = function () {
  var self = this
  if (!this._environment.SERVICES) {
    this.logger.warn('No services defined')
    return
  }
  var services = this._environment.SERVICES.split(' ')
  _.forEach(services, function (serviceName) {
    self.createService(serviceName)
  })
}

Runtime.prototype.hasService = function (serviceName) {
  return _.has(this.services, serviceName)
}

Runtime.prototype.createService = function (serviceName) {
  var factoryFunctions = {
    'mdns': this._createmDNS,
    'kademlia': this._createKademlia,
    'flukso': this._createFlukso,
    'devices': this._createDevices,
    'serviceManager': this._createServiceManager,
    'tenants': this._createTenantService,
    'events': this._createEventsService,
    'status': this._createStatusManager
  }
  if (_.has(factoryFunctions, serviceName)) {
    if (!this.hasService(serviceName)) {
      factoryFunctions[serviceName].call(this)
    }
    return true
  }
  return false
}

Runtime.prototype._createmDNS = function () {
  this.services.mdns = new MulticastDNS({
    platform: this.platform,
    logger: this.logger
  })
}

Runtime.prototype._createKademlia = function () {
  this.services.kademlia = new Kademlia({
    platform: this.platform,
    storage: this._getKadStore('kademlia'),
    directoryStorage: this._getKadStore('directory'),
    telemetryStorage: this._getKadStore('kademlia-telemetry'),
    logger: this.logger
  })
}

Runtime.prototype._createServiceManager = function () {
  this.services.serviceManager = new ServiceManager({
    platform: this.platform,
    logger: this.logger,
    runtime: this,
    storage: this._getKadStore('serviceManager')
  })
}

Runtime.prototype._createFlukso = function () {
  this.services.flukso = new Flukso({
    logger: this.logger,
    platform: this.platform
  })
}

Runtime.prototype._createStatusManager = function () {
  this.services.status = new StatusManager({
    logger: this.logger,
    platform: this.platform
  })
}

Runtime.prototype._createDevices = function () {
  this.services.devices = new DevicesManager({
    storage: this._getPouchStore('devices'),
    logger: this.logger,
    platform: this.platform
  })
}

Runtime.prototype._createTenantService = function () {
  this.services.tenants = new TenantService({
    runtime: this,
    runtimeClass: Runtime,
    storage: this._getKadStore('tenants'),
    secret: this._environment.SECRET,
    platform: this.platform,
    logger: this.logger
  })
}

Runtime.prototype._createEventsService = function () {
  this.services.events = new Events({
    logger: this.logger,
    platform: this.platform
  })
}

Runtime.prototype.activateServices = function () {
  var self = this
  if (_.has(this.services, 'serviceManager')) {
    _.forEach(this.services, function (object, key) {
      self.services.serviceManager.activate(key)
    })
  }
}

module.exports = Runtime

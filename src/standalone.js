var EventEmitter = require('events').EventEmitter
var inherits = require('inherits')
var levelup = require('levelup')
var mkdirp = require('mkdirp')
var Q = require('q')
var uuid = require('uuid')
var winston = require('winston')
var Platform = require('flunky-platform')
var services = require('./services/index.js')

/**
 * Create Standalone DHT node
 * @param {Object} args
 */
function StandaloneDHT (args) {
  if (!(this instanceof StandaloneDHT)) return new StandaloneDHT(args)
  this.args = args
  winston.level = this.args.loglevel.server
  winston.info('[kadserver] kad sever configuration = ' + JSON.stringify(this.args))
  this.platform = new Platform({
    storage: null
  })
  EventEmitter.call(this)
  this._initializeServices()
}

inherits(StandaloneDHT, EventEmitter)

StandaloneDHT.prototype._initializeServices = function () {
  this.profile = new services.Profile({
    platform: this.platform,
    storage: null
  })
  this.mdns = new services.mDNS({
    platform: this.platform,
    storage: null
  })
  this.dht = new services.Kademlia({
    platform: this.platform,
    storage: null,
    seeds: null
  })
}

/**
 * Activate KAD server
 */
StandaloneDHT.prototype.activate = function () {
  var self = this
  // create storage folder (if missing)
  _createStorageFolderP(self.args)
    .then(function () {
      // port mapping -- get public ip address if not specified in args
      return _getPublicAddressP(self.args)
    })
    .then(function (ip) {
      if (ip) {
        // store IP address
        self.args.nat.public_address = ip
      }
      // port mapping -- map private to public port
      return _mapPrivateToPublicPortP(self.args)
    })
    .then(function (pmargs) {
      // store pmargs, needed to unmap ports later on ...
      self.pmargs = pmargs
      // launch dht instance
      return _initKadDhtP(self.args)
    })
    .then(function (dht) {
      // store dht instance
      self.dht = dht
    })
    .catch(function (error) {
      winston.error('[kadserver] init Kad node failed. ' + error)
      self.emit('error', error)
    })
    .done(function () {
      winston.info('[kadserver] kad server running at ' + self.dht.address + ':' + self.dht.port)
      if (self.dht.connected) {
        self.ready = true
        self.emit('ready')
      } else {
        self.emit('no peers')
      }
    })
}

function _createStorageFolderP (args) {
  var deferred = Q.defer()
  if (typeof args.storage !== 'string') {
    winston.debug('[kadserver] not using storage folder')
    // return, this is not a ref to a local folder
    deferred.resolve()
  } else {
    winston.debug('[kadserver] creating storage folder ' + args.storage)
    mkdirp(args.storage, function (error) {
      if (error) {
        winston.error('[kadserver] could not create storage folder ' + args.storage + '. ' + error)
        deferred.reject(error)
      } else {
        deferred.resolve()
      }
    })
  }
  return deferred.promise
}

function _initKadDhtP (args) {
  var port, address
  if (args.nat) {
    port = args.nat.public_port
    address = args.nat.public_address
  }
  port = port || args.port
  address = address || args.address

  var storage = (typeof args.storage === 'string') ? levelup(args.storage) : args.storage

  var kadArgs = {
    address: address,
    port: port,
    seeds: args.seeds,
    storage: storage,
    logLevel: args.loglevel.kad
  }

  kadArgs.transport = _getTransportModule(args)

  winston.debug('[kadserver] creating dht listening at ' + address + ':' + port)
  var deferred = Q.defer()
  // create dht
  var dht = kademlia(kadArgs)
  dht.address = address
  dht.port = port

  // if no seeds, then we're done (this is a bootstrap node)
  if (args.seeds.length === 0) {
    winston.debug('[kadserver] no seeds specified -- this is a bootstrap node')
    dht.on('listening', function () {
      deferred.resolve(dht)
    })
  } else {
    // connect to overlay network
    winston.debug('[kadserver] connecting dht instance to seeds ' + JSON.stringify(args.seeds))
    dht.on('connect', function (error) {
      if (error) {
        winston.error('[kadserver] could not connect to seeds. ' + error)
        deferred.reject(error)
      } else {
        winston.debug('[kadserver] overlay connection succeeded')
        dht.connected = true
        deferred.resolve(dht)
      }
    })
  }

  return deferred.promise
}

module.exports = StandaloneDHT

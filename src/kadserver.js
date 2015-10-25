module.exports = KadServer

var EventEmitter = require('events').EventEmitter
var ipAddresses = require('./ip-addresses')
var inherits = require('inherits')
var kademlia = require('kad')
var levelup = require('levelup')
var mkdirp = require('mkdirp')
var nat = require('./nat-upnp')
var Q = require('q')
var uuid = require('uuid')
var winston = require('winston')

inherits(KadServer, EventEmitter)

/**
 * Create KAD server
 * @param {Object} args
 */
function KadServer (args) {
  if (!(this instanceof KadServer)) return new KadServer(args)
  this.args = args
  winston.level = args.loglevel.server
  winston.info('[kadserver] kad sever configuration = ' + JSON.stringify(this.args))
}

/**
 * Activate KAD server
 */
KadServer.prototype.activate = function () {
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

/** Deactivate KAD server
 */
KadServer.prototype.deactivate = function (cb) {
  var self = this
  // port unmapping
  nat.unmapPrivateToPublicPort(self.pmargs)
    .then(function () {
      cb()
    })
    .catch(function (error) {
      winston.error('[kadserver] deactivation of Kad node failed. ' + error)
      cb(error)
    })
}

/**
 * Put KV tuple into dht
 * @param {String} key
 * @param {Object} value
 * @param {Integer} ttl
 */
KadServer.prototype.putP = function (key, value, ttl) {
  var deferred = Q.defer()
  if (!this.ready) {
    var msg = '[kadserver] kad server not ready to store KV tuples.'
    winston.error(msg)
    deferred.reject(new Error(msg))
  } else {
    var dataObject = {}
    dataObject.value = value
    if (ttl) {
      var now = new Date()
      var expires = now.getTime() + (1000 * ttl)
      dataObject.expires = expires
    }
    winston.debug('[kadserver] kad server storing [' + key + ',' + JSON.stringify(dataObject) + '].')
    this.dht.put(key, dataObject, function (error) {
      if (error) {
        winston.error('[kadserver] kad server failed storing [' + key + ',' + dataObject + ',' + ttl + ']. ' + error)
        deferred.reject(error)
      } else {
        winston.debug('[kadserver] kad server stored KV tuple.')
        deferred.resolve()
      }
    })
  }
  return deferred.promise
}

/**
 * Get value from dht
 * @param {String} key
 * @return {Object|null} value
 */
KadServer.prototype.getP = function (key) {
  var deferred = Q.defer()
  if (!this.ready) {
    var msg = '[kadserver] kad server not ready to retrieve values.'
    winston.error(msg)
    deferred.reject(new Error(msg))
  } else {
    var self = this
    this.dht.get(key, function (error, dataObject) {
      if (error) {
        winston.error('[kadserver] kad server failed retrieving value for ' + key + '. ' + error)
        deferred.reject(error)
      } else {
        var expires = dataObject.expires
        if (!expires) {
          deferred.resolve(dataObject.value)
        } else {
          var now = new Date()
          if (now.getTime() < expires) {
            deferred.resolve(dataObject.value)
          } else {
            deferred.resolve(null)
            self.delP(key)
          }
        }
      }
    })
  }
  return deferred.promise
}

/**
 * Delete KV tuple from dht
 */
KadServer.prototype.delP = function (key) {
  var deferred = Q.defer()
  if (!this.ready) {
    var msg = '[kadserver] kad server not ready to delete KV tuples.'
    winston.error(msg)
    deferred.reject(new Error(msg))
    return deferred.promise
  } else {
    return this.putP(key, null)
  }
  return deferred.promise
}

KadServer.prototype.testP = function () {
  var key = 'test_' + uuid.v4()
  var value = uuid.v4()
  var self = this
  return this.putP(key, value)
    .then(function () {
      return self.getP(key)
    })
    .then(function (storedValue) {
      if (storedValue !== value) {
        throw new Error('Test failure -- stored value != expected value')
      }
      return self.delP(key)
    })
}

/**
 * helper functions
 */
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

function _getPublicAddressP (args) {
  var deferred = Q.defer()
  // case 1: we're not located behind a NAT box
  if (!args.nat) {
    winston.debug('[kadserver] node is not located behind NAT device -- no demand to determine public IP address')
    deferred.resolve()
  // case 2: public address is known
  } else if (args.nat.public_address) {
    winston.debug('[kadserver] public address is already set')
    deferred.resolve()
  // case 3: public address can be retrieved from UPnP enabled GW
  } else if (args.nat.type.toLowerCase() === 'upnp') {
    return nat.getPublicGWAddressP()
  // case 4: public address will be retrieved while executing STUN -- so let's get this address using some other tricks
  } else if (args.nat.type.toLowerCase() === 'stun') {
    return ipAddresses.getPublicIpAddressP()
  // case 5: no other options left -- giving up
  } else {
    var msg = "[kadserver] don't know how to retrieve this node's public IP address ..."
    winston.error(msg)
    deferred.reject(new Error(msg))
  }
  return deferred.promise
}

function _mapPrivateToPublicPortP (args) {
  var deferred = Q.defer()
  if (!args.nat) {
    winston.debug('[kadserver] node is not located behind NAT device -- no demand for portmapping')
    deferred.resolve()
  } else {
    switch (args.nat.type.toLowerCase()) {
      case 'manual':
        // port forwarding is configured manually
        winston.debug('[kadserver] manual port mapping -- no action needed')
        deferred.resolve()
        break
      case 'stun':
        // using UDP+STUN to reach private address
        winston.debug('[kadserver] STUN based port mapping -- no action needed')
        deferred.resolve()
        break
      case 'upnp':
        winston.debug('[kadserver] using nat-upnp to open ports on GW')
        var pmargs = {}
        pmargs.public = {}
        pmargs.private = {}
        pmargs.private.port = args.port
        pmargs.public.port = args.nat.public_port || args.port
        pmargs.protocol = 'UDP'
        pmargs.ttl = 0
        pmargs.description = 'flunky:dht'
        return nat.mapPrivateToPublicPortP(pmargs)
      default:
        winston.debug('[kadserver] cannot process nat type ' + args.nat.type)
    }
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

  if (args.transport) {
    kadArgs.transport = args.transport
  }

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

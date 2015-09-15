module.exports = KadServer;

var EventEmitter = require('events').EventEmitter;
var inherits = require('inherits');
var kademlia = require('kad');
var levelup = require('levelup');
var mkdirp = require('mkdirp');
var natUPnP = require('nat-upnp');
var Logger = require('../node_modules/kad/lib/logger');
var Q = require('q');

inherits(KadServer, EventEmitter)

/**
 * Create KAD server
 * @param {Object} args
 */
function KadServer(args) {
  if (!(this instanceof KadServer)) return new KadServer(args);
  this.args = args;
  this._log = new Logger(args.logLevel);
  this._log.info('[kadserver] kad sever configuration = ' + JSON.stringify(this.args));
};

/**
 * Activate KAD server
 */
KadServer.prototype.activate = function() {
  var self = this;
  // create storage folder (if missing)
  _createStorageFolder(self.args, self._log)
  .then(function() {
    // port mapping -- get public ip address if not specified in args
    return _getPublicAddress(self.args, self._log);
  })
  .then(function(ip) {
    if (ip) {
      // store IP address
      self.args.nat.address = ip;
    };
    // port mapping -- map private to public port
    return _mapPrivateToPublicPort(self.args, self._log);
  })
  .then(function() {
    // launch dht instance
    return _initKadDht(self.args, self._log)
  })
  .then(function(dht) {
    // store dht instance
    self.dht = dht;
  })
  .catch(function (error) {
    self._log.error('[kadserver] init Kad node failed. ' + error);
    self.emit('error', error);
  })
  .done(function() {
    self._log.info('[kadserver] kad server running at ' + self.dht.address + ':' + self.dht.port);
    if (self.dht.connected) {
      self.ready = true;
      self.emit('ready');
    } else {
      self.emit('no peers');
    };
  });
};

/** Deactivate KAD server
 */
 KadServer.prototype.deactivate = function(cb) {
   var self = this;
   // port unmapping
   _unmapPrivateToPublicPort(self.args, self._log)
   .then(function() {
     cb();
   })
   .catch(function (error) {
     self._log.error('[kadserver] deactivation of Kad node failed. ' + error);
     cb(error);
   });
 };


/**
 * Put KV tuple into dht
 * @param {String} key
 * @param {Object} value
 * @param {Integer} ttl
 */
KadServer.prototype.put = function(key, value, ttl) {
  var deferred = Q.defer();
  if (!this.ready) {
    var msg = '[kadserver] kad server not ready to store KV tuples.';
    this._log.error(msg);
    deferred.reject(new Error(msg));
  }
  else {
    var dataObject = {};
    dataObject.value = value;
    if (ttl) {
      var now = new Date();
      var expires = now.getTime() + (1000 * ttl);
      dataObject.expires = expires;
    }
    this._log.debug('[kadserver] kad server storing [' + key + ',' + JSON.stringify(dataObject) + '].');
    var self = this;
    this.dht.put(key, dataObject, function(error) {
      if (error) {
        self._log.error('[kadserver] kad server failed storing [' + key + ',' + dataObject + ',' + ttl + ']. ' + error);
        deferred.reject(error);
      } else {
        self._log.debug('[kadserver] kad server stored KV tuple.')
        deferred.resolve();
      }
    });
  };
  return deferred.promise;
};

/**
 * Get value from dht
 * @param {String} key
 * @return {Object|null} value
 */
KadServer.prototype.get = function(key) {
  var deferred = Q.defer();
  if (!this.ready) {
    var msg = '[kadserver] kad server not ready to retrieve values.';
    this._log.error(msg);
    deferred.reject(new Error(msg));
  }
  else {
    var self = this;
    this.dht.get(key, function(error, dataObject) {
      if (error) {
        self._log.error('[kadserver] kad server failed retrieving value for ' + key + '. ' + error);
        deferred.reject(error);
      } else {
        var expires = dataObject.expires;
        if (!expires) {
          deferred.resolve(dataObject.value)
        } else {
          var now = new Date();
          if (now.getTime() < expires) {
            deferred.resolve(dataObject.value);
          } else {
            deferred.resolve(null);
            self.del(key);
          }
        }
      }
    });
  };
  return deferred.promise;
};

/**
 * Delete KV tuple from dht
 */
KadServer.prototype.del = function(key) {
  var deferred = Q.defer();
  if (!this.ready) {
    var msg = '[kadserver] kad server not ready to delete KV tuples.';
    this._log.error(msg);
    deferred.reject(new Error(msg));
    return deferred.promise;
  }
  else {
    return this.put(key, null);
  };
  return deferred.promise;
};

/** Promises */

function _createStorageFolder(args, _log) {
  var deferred = Q.defer();
  if (typeof args.storage !== 'string') {
    _log.debug('[kadserver] not using storage folder');
    // return, this is not a ref to a local folder
    deferred.resolve();
  } else {
    _log.debug('[kadserver] creating storage folder ' + args.storage);
    mkdirp(args.storage, function (error) {
      if (error) {
        _log.error('[kadserver] could not create storage folder ' + args.storage + '. ' + error);
        deferred.reject(error);
      }
      else {
        deferred.resolve();
      }
    });
  }
  return deferred.promise;
};

function _getPublicAddress(args, _log) {
  var deferred = Q.defer();
  if (!args.nat) {
    _log.debug('[kadserver] node is not located behind NAT device -- no demand to determine public IP address');
    deferred.resolve();
  }
  else if (args.nat.address) {
    _log.debug('[kadserver] public address is already set');
    deferred.resolve(args.nat.address);
  }
  else {
    _log.debug('[kadserver] retrieving public address');
    var client = natUPnP.createClient();
    client.externalIp(function(error, ip) {
      client.close();
      if (error) {
        _log.error('[kadserver] could not determine public IP address. ' + error);
        deferred.reject(error);
      }
      else {
        deferred.resolve(ip);
      };
    });
  };
  return deferred.promise;
};

function _mapPrivateToPublicPort(args, _log) {
  var deferred = Q.defer();
  if (!args.nat) {
    _log.debug('[kadserver] node is not located behind NAT device -- no demand for portmapping');
    deferred.resolve();
  }
  else {
    _log.debug('[kadserver] mapping private port ' + args.port + ' to public port ' + args.nat.port);
    var client = natUPnP.createClient();
    var pmargs = {};
    pmargs.public = {};
    pmargs.private = {};
    pmargs.public.port = args.nat.port;
    pmargs.public.host = args.nat.address;
    pmargs.private.port = args.port;
    pmargs.ttl = 0;
    pmargs.protocol = 'udp';
    pmargs.description = 'flunky:kad';
    client.portMapping(pmargs, function(error) {
      client.close();
      if (error) {
        _log.error('[kadserver] could not map local port ' + args.port + ' to public port ' + args.nat.port + '. ' + error);
        deferred.reject(error);
      }
      else {
        deferred.resolve();
      }
    });
  };
  return deferred.promise;
};

function _unmapPrivateToPublicPort(args, _log) {
  var deferred = Q.defer();
  if (!args.nat) {
    _log.debug('[kadserver] node is not located behind NAT device -- no ports to be unmapped');
    deferred.resolve();
  }
  else {
    _log.debug('[kadserver] unmapping public port ' + args.nat.port);
    var client = natUPnP.createClient();
    var pmargs = {};
    pmargs.public = {};
    pmargs.private = {};
    pmargs.public.port = args.nat.port;
    pmargs.public.host = args.nat.address;
    pmargs.private.port = args.port;
    pmargs.ttl = 0;
    pmargs.protocol = 'udp';
    pmargs.description = 'flunky:kad';
    client.portUnmapping(pmargs, function(error) {
      client.close();
      if (error) {
        _log.error('[kadserver] could not unmap public port ' + args.nat.port + '. ' + error);
        deferred.reject(error);
      }
      else {
        deferred.resolve();
      }
    });
  };
  return deferred.promise;
};

function _initKadDht(args, _log) {
  var port = args.nat? args.nat.port: false || args.port;
  var address = args.nat? args.nat.address: false || args.address;
  var storage = (typeof args.storage === 'string')? levelup(args.storage): args.storage;
  _log.debug('[kadserver] creating dht listening at ' + address + ':' + port);
  var deferred = Q.defer();
  // create dht
  var dht = kademlia({
    address: address,
    port: port,
    seeds: args.seeds,
    storage: storage,
    logLevel: args.logLevel
  });
  dht.address = address;
  dht.port = port;
  // if no seeds, then we're done (this is a bootstrap node)
  if (args.seeds.length == 0) {
    _log.debug('[kadserver] no seeds specified -- this is a bootstrap node');
    deferred.resolve(dht);
  }
  else {
    // connect to overlay network
    _log.debug('[kadserver] connecting dht instance to seeds ' + JSON.stringify(args.seeds));
    dht.on('connect', function(error) {
      if (error) {
        _log.error('[kadserver] could not connect to seeds. ' + error);
        deferred.reject(error);
      }
      else {
        _log.debug('[kadserver] overlay connection succeeded');
        dht.connected = true;
        deferred.resolve(dht);
      }
    });
  }
  return deferred.promise;
};

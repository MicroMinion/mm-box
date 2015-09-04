module.exports = KadServer;

var EventEmitter = require('events').EventEmitter;
var inherits = require('inherits');
var kademlia = require('kad');
var levelup = require('levelup');
var mkdirp = require('mkdirp');
var natUPnP = require('nat-upnp');
var Q = require('q');

inherits(KadServer, EventEmitter)

/**
 * Create KAD server
 * @param {Object} opts
 */
function KadServer (opts) {
  var self = this;
  if (!(self instanceof KadServer)) return new KadServer(opts);
  self.opts = opts;
  console.log('Kad server configuration = ' + JSON.stringify(self.opts));
};

/** Activate KAD server
  */
KadServer.prototype.activate = function() {
  var self = this;
  // create storage folder (if missing)
  _createStorageFolder(self.opts)
  .then(function() {
    // port mapping -- get public ip address if not specified in opts
    return _getPublicAddress(self.opts);
  })
  .then(function(ip) {
    if (ip) {
      // store IP address
      self.opts.nat.address = ip;
    };
    // port mapping -- map private to public port
    return _mapPrivateToPublicPort(self.opts);
  })
  .then(function() {
    // launch dht instance
    return _initKadDht(self.opts)
  })
  .then(function(dht) {
    // store dht instance
    self.dht = dht;
  })
  .catch(function (error) {
    console.error('Init Kad node failed. ' + error);
    self.emit('error', error);
  })
  .done(function() {
    console.log('Kad server running at ' + self.dht.address + ':' + self.dht.port);
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
   _unmapPrivateToPublicPort(self.opts)
   .then(function() {
     cb();
   })
   .catch(function (error) {
     console.error('Deactivation of Kad node failed. ' + error);
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
  var self = this;
  var deferred = Q.defer();
  if (!self.ready) {
    var msg = 'Kad server not ready to store KV tuples.';
    console.error(msg);
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
    console.log('Kad server storing [' + key + ',' + JSON.stringify(dataObject) + '].');
    self.dht.put(key, dataObject, function(error) {
      if (error) {
        console.error('Kad server failed storing [' + key + ',' + dataObject + ',' + ttl + ']. ' + error);
        deferred.reject(error);
      } else {
        console.log('Kad server stored KV tuple.')
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
  var self = this;
  var deferred = Q.defer();
  if (!self.ready) {
    var msg = 'Kadserver not ready to retrieve values.';
    console.error(msg);
    deferred.reject(new Error(msg));
  }
  else {
    self.dht.get(key, function(error, dataObject) {
      if (error) {
        console.error('Kad server failed retrieving value for ' + key + '. ' + error);
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
  var self = this;
  var deferred = Q.defer();
  if (!self.ready) {
    var msg = 'Kadserver not ready to delete KV tuples.';
    console.error(msg);
    deferred.reject(new Error(msg));
    return deferred.promise;
  }
  else {
    return self.put(key, null);
  };
  return deferred.promise;
};

/** Promises */

function _createStorageFolder(opts) {
  var deferred = Q.defer();
  if (typeof opts.storage !== 'string') {
    console.log('Not using storage folder');
    // return, this is not a ref to a local folder
    deferred.resolve();
  } else {
    console.log('Creating storage folder ' + opts.storage);
    mkdirp(opts.storage, function (error) {
      if (error) {
        console.error('Could not create storage folder ' + opts.storage + '. ' + error);
        deferred.reject(error);
      }
      else {
        deferred.resolve();
      }
    });
  }
  return deferred.promise;
};

function _getPublicAddress(opts) {
  var deferred = Q.defer();
  if (!opts.nat) {
    console.log('Node is not located behind NAT device -- no demand to determine public IP address');
    deferred.resolve();
  }
  else if (opts.nat.address) {
    console.log('Public address is already set');
    deferred.resolve(opts.nat.address);
  }
  else {
    console.log('Retrieving public address');
    var client = natUPnP.createClient();
    client.externalIp(function(error, ip) {
      client.close();
      if (error) {
        console.error('Could not determine public IP address. ' + error);
        deferred.reject(error);
      }
      else {
        deferred.resolve(ip);
      };
    });
  };
  return deferred.promise;
};

function _mapPrivateToPublicPort(opts) {
  var deferred = Q.defer();
  if (!opts.nat) {
    console.log('Node is not located behind NAT device -- no demand for portmapping');
    deferred.resolve();
  }
  else {
    console.log('Mapping private port ' + opts.port + ' to public port ' + opts.nat.port);
    var client = natUPnP.createClient();
    var pmOpts = {};
    pmOpts.public = {};
    pmOpts.private = {};
    pmOpts.public.port = opts.nat.port;
    pmOpts.public.host = opts.nat.address;
    pmOpts.private.port = opts.port;
    pmOpts.ttl = 0;
    pmOpts.protocol = 'udp';
    pmOpts.description = 'flunky:kad';
    client.portMapping(pmOpts, function(error) {
      client.close();
      if (error) {
        console.error('Could not map local port ' + opts.port + ' to public port ' + opts.nat.port + '. ' + error);
        deferred.reject(error);
      }
      else {
        deferred.resolve();
      }
    });
  };
  return deferred.promise;
};

function _unmapPrivateToPublicPort(opts) {
  var deferred = Q.defer();
  if (!opts.nat) {
    console.log('Node is not located behind NAT device -- no ports to be unmapped');
    deferred.resolve();
  }
  else {
    console.log('Unmapping public port ' + opts.nat.port);
    var client = natUPnP.createClient();
    var pmOpts = {};
    pmOpts.public = {};
    pmOpts.private = {};
    pmOpts.public.port = opts.nat.port;
    pmOpts.public.host = opts.nat.address;
    pmOpts.private.port = opts.port;
    pmOpts.ttl = 0;
    pmOpts.protocol = 'udp';
    pmOpts.description = 'flunky:kad';
    client.portUnmapping(pmOpts, function(error) {
      client.close();
      if (error) {
        console.error('Could not unmap public port ' + opts.nat.port + '. ' + error);
        deferred.reject(error);
      }
      else {
        deferred.resolve();
      }
    });
  };
  return deferred.promise;
};

function _initKadDht(opts) {
  var port = opts.nat? opts.nat.port: false || opts.port;
  var address = opts.nat? opts.nat.address: false || opts.address;
  var storage = (typeof opts.storage === 'string')? levelup(opts.storage): opts.storage;
  console.log('Creating dht listening at ' + address + ':' + port);
  var deferred = Q.defer();
  // create dht
  var dht = kademlia({
    address: address,
    port: port,
    seeds: opts.seeds,
    storage: storage,
    logLevel: opts.logLevel
  });
  dht.address = address;
  dht.port = port;
  // if no seeds, then we're done (this is a bootstrap node)
  if (opts.seeds.length == 0) {
    console.log('No seeds specified -- this is a bootstrap node');
    deferred.resolve(dht);
  }
  else {
    // connect to overlay network
    console.log('Connecting dht instance to seeds ' + JSON.stringify(opts.seeds));
    dht.on('connect', function(error) {
      if (error) {
        console.error('Could not connect to seeds. ' + error);
        deferred.reject(error);
      }
      else {
        console.log('Overlay connection succeeded');
        dht.connected = true;
        deferred.resolve(dht);
      }
    });
  }
  return deferred.promise;
};

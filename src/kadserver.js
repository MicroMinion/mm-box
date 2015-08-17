module.exports = KadServer;

var EventEmitter = require('events').EventEmitter;
var inherits = require('inherits');
var kademlia = require('kad');
var levelup = require('levelup');
var mkdirp = require('mkdirp');
var nat = require('nat-upnp').createClient();
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
  createStorageFolder(self.opts)
  .then(function() {
    // port mapping -- map private to public port
    return mapPrivateToPublicPort(self.opts);
  })
  .then(function() {
    // port mapping -- get public ip address if not specified in opts
    return getPublicAddress(self.opts);
  })
  .then(function(ip) {
    // launch dht instance
    self.opts.address = ip;
    return initKadDht(self.opts)
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
    console.log('Kad server running at ' + self.opts.address + ':' + self.opts.port);
    if (self.dht.connected) {
      self.ready = true;
      self.emit('ready');
    } else {
      self.emit('no peers');
    };
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
    var msg = 'Kadserver not ready to store KV tuples.';
    console.error(msg);
    deferred.reject(new Error(msg));
  }
  else {
    self.dht.put(key, value, function(error) {
      if (error) {
        console.error('Kad server failed storing [' + key + ',' + value + ',' + ttl + ']. ' + error);
        deferred.reject(error);
      } else {
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
    self.dht.get(key, function(error, value) {
      if (error) {
        console.error('Kad server failed retrieving value for ' + key + '. ' + error);
        deferred.reject(error);
      } else {
        deferred.resolve(value);
      }
    });
  };
  return deferred.promise;
};

/**
 * Delete KV tuple from dht
 */
KadServer.prototype.del = function(key) {

};

/** Promises */

function createStorageFolder(opts) {
  console.log('Creating storage folder ' + opts.storage);
  var deferred = Q.defer();
  mkdirp(opts.storage, function (error) {
    if (error) {
      console.error('Could not create storage folder ' + opts.storage + '. ' + error);
      deferred.reject(error);
    }
    else {
      deferred.resolve();
    }
  });
  return deferred.promise;
};

function mapPrivateToPublicPort(opts) {
  var deferred = Q.defer();
  if (opts.public_port == undefined) {
    console.log('No public port defined, so no portmapping requested');
    deferred.resolve();
  }
  else {
    console.log('Mapping private port ' + opts.port + ' to public port ' + opts.public_port);
    nat.portMapping({
      public: opts.public_port,
      private: opts.port,
      ttl: 0 // indefinite lease
    }, function(error) {
      if (error) {
        console.error('Could not map local port ' + opts.port + ' to public port ' + opts.public_port + '. ' + error);
        deferred.reject(error);
      }
      else {
        deferred.resolve();
      }
    });
  };
  return deferred.promise;
};

function getPublicAddress(opts) {
  var deferred = Q.defer();
  if (opts.address) {
    console.log('Public address is already set');
    deferred.resolve(opts.address);
  }
  else {
    console.log('Retrieving public address');
    nat.externalIp(function(error, ip) {
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

function initKadDht(opts) {
  console.log('Creating dht listening at ' + opts.address + ':' + opts.port);
  var deferred = Q.defer();
  // create dht
  var dht = kademlia({
    address: opts.address,
    port: opts.port,
    seeds: opts.seeds,
    storage: levelup(opts.storage)
  });
  // if no seeds, then done (this is a bootstrap node)
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

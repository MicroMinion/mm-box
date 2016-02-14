var kademlia = require('kad')
var inherits = require('inherits')
var debug = require('debug')('flunky-platform:services:kademlia')

var _ = require('lodash')

var seeds = {}

var KademliaService = function (options) {
  debug('initialize')
  this.messaging = options.platform.messaging
  this.storage = options.storage
  this.replyTo = {}
  this.online = false
  this.messaging.on('self.messaging.myConnectionInfo', this._updateReplyTo.bind(this))
}

KademliaService.prototype._updateReplyTo = function (topic, publicKey, data) {
  debug('_updateReplyTo')
  this.replyTo.publicKey = data.publicKey
  this.replyTo.connectionInfo = data
  if (!this.dht) {
    this._setup()
  }
  if (this.online) {
    this.dht.put(data.publicKey, data, function (err) {
      debug(err)
    })
  }
}

KademliaService.prototype._setup = function () {
  debug('_setup')
  var service = this
  this.messaging.on('self.directory.get', this.get.bind(this))
  this.messaging.on('self.directory.put', this.put.bind(this))
  this.messaging.on('self.messaging.connectionInfo', this.connect.bind(this))
  this.messaging.on('self.messaging.requestConnectionInfo', this.requestConnectionInfo.bind(this))
  this.dht = new kademlia.Node({
    messaging: this.messaging,
    storage: this.storage,
    transport: FlunkyTransport,
    replyto: this.replyTo
  })
  this.dht.once('connect', function () {
    service.online = true
  })
  this._setupSeeds()
  this.messaging.send('messaging.requestAllConnectionInfo', 'local', {})
}
KademliaService.prototype.connect = function (topic, publicKey, data) {
  debug('connect')
  if (data.publicKey !== this.replyTo.publicKey) {
    this.dht.connect({publicKey: data.publicKey, connectionInfo: data})
  }
}

KademliaService.prototype.requestConnectionInfo = function (topic, publicKey, data) {
  debug('requestConnectionInfo')
  // TODO: Also check and use info from internal routing table
  publicKey = data
  var self = this
  if (!this.online) { return }
  this.dht.get(publicKey, function (err, value) {
    if (!value) {
      debug(err)
      return
    }
    self.messaging.send('messaging.connectionInfo', 'local', value)
  })
}

KademliaService.prototype.get = function (topic, publicKey, data) {
  debug('get')
  var self = this
  if (!this.online) { return }
  this.dht.get(data.key, function (err, value) {
    if (!value) {
      debug(err)
      return
    }
    self.messaging.send('directory.getReply', 'local', {key: data.key, value: value})
  })
}
KademliaService.prototype.put = function (topic, publicKey, data) {
  debug('put')
  if (this.online) {
    this.dht.put(data.key, data.value)
  }
}

/**
 * Put KV tuple into dht
 * @param {String} key
 * @param {Object} value
 * @param {Integer} ttl
 */
/*
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
*/

/**
 * Get value from dht
 * @param {String} key
 * @return {Object|null} value
 */
/*
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
*/

/**
 * Delete KV tuple from dht
 */
/*
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

KademliaService.prototype._setupSeeds = function () {
 debug('_setupSeeds')
 var self = this
 _.forEach(seeds, function (connectionInfo, publicKey) {
   this.messaging.send('messaging.connectionInfo', 'local', connectionInfo)
   setImmediate(function () {
     self.dht.connect({publicKey: publicKey, connectionInfo: connectionInfo})

   })
 }, this)
}

*/

module.exports = KademliaService

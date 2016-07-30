'use strict'

var Platform = require('mm-platform')
var MulticastDNS = require('mm-services-mdns')
var Kademlia = require('mm-services-kademlia')
var winston = require('winston')
var MemStore = require('kad-memstore-thomas')
var winstonWrapper = require('winston-meta-wrapper')
var _ = require('lodash')

/**
 * Create Standalone DHT node
 */
function DHT (options) {
  var self = this
  if (!(this instanceof DHT)) return new DHT()
  if (!options) {
    options = {}
  }
  if (options.logger) {
    this._logger = options.logger
  } else {
    this._logger = winston
  }
  if (_.isUndefined(options.mDNS)) {
    options.mDNS = true
  }
  if (!options.platformStore) {
    this.platformStore = new MemStore()
  } else {
    this.platformStore = options.platformStore
  }
  if (!options.dhtStore) {
    this.dhtStore = new MemStore()
  } else {
    this.dhtStore = options.dhtStore
  }
  this.platform = new Platform({
    storage: this.platformStore,
    connectionInfo: options.connectionInfo,
    logger: winstonWrapper(this._logger),
    identity: options.identity
  })
  this.platform.on('ready', function () {
    self._logger = winstonWrapper(self._logger)
    self._logger.addMeta({
      node: self.platform.identity.getSignId()
    })
    self._initializeServices(options.mDNS)
  })
}

DHT.prototype.start = function () {}

DHT.prototype._initializeServices = function (mDNS) {
  if (mDNS) {
    this.mdns = new MulticastDNS({
      platform: this.platform,
      logger: this._logger
    })
  }
  this.dht = new Kademlia({
    platform: this.platform,
    storage: this.dhtStore,
    logger: this._logger,
    seeds: null
  })
}

module.exports = DHT

var EventEmitter = require('events').EventEmitter
var inherits = require('inherits')
var Q = require('q')
var Platform = require('flunky-platform')
var services = require('./services/index.js')
var kadfs = require('kad-fs')
var path = require('path')

var storageDir = './data'

/**
 * Create Standalone DHT node
 */
function StandaloneDHT () {
  if (!(this instanceof StandaloneDHT)) return new StandaloneDHT()
  // TODO: Fill in
  this.platform = new Platform({
    identity: null,
    directory: null,
    storage: kadfs(path.join(storageDir, 'platform'))
  })
  EventEmitter.call(this)
  this._initializeServices()
}

inherits(StandaloneDHT, EventEmitter)

StandaloneDHT.prototype._initializeServices = function () {
  this.profile = new services.Profile({
    platform: this.platform,
    storage: kadfs(path.join(storageDir, 'profile'))
  })
  this.mdns = new services.mDNS({
    platform: this.platform,
    storage: kadfs(path.join(storageDir, 'mdns'))
  })
  this.dht = new services.Kademlia({
    platform: this.platform,
    storage: kadfs(path.join(storageDir, 'dht')),
    seeds: null
  })
}

module.exports = {
  run: function () {
    new StandaloneDHT()
  }
}

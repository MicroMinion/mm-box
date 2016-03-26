var Platform = require('flunky-platform')
var services = require('flunky-services')
var kadfs = require('kad-fs')
var path = require('path')

var storageDir = './data'

/**
 * Create Standalone DHT node
 */
function DHT () {
  if (!(this instanceof DHT)) return new DHT()
  this.platform = new Platform({
    storage: kadfs(path.join(storageDir, 'platform'))
  })
  this._initializeServices()
}

DHT.prototype._initializeServices = function () {
  this.profile = new services.BasicProfile({
    platform: this.platform,
    storage: kadfs(path.join(storageDir, 'profile'))
  })
  this.mdns = new services.MulticastDNS({
    platform: this.platform,
    storage: kadfs(path.join(storageDir, 'mdns'))
  })
  this.dht = new services.Kademlia({
    platform: this.platform,
    storage: kadfs(path.join(storageDir, 'dht')),
    seeds: null
  })
}

module.exports = DHT

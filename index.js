'use strict'

var Platform = require('mm-platform')
var MulticastDNS = require('mm-services-mdns')
var Kademlia = require('mm-services-kademlia')
var kadfs = require('kad-fs')
var path = require('path')
var mkdirp = require('mkdirp')

var storageDir = './data'

/**
 * Create Standalone DHT node
 */
function DHT () {
  if (!(this instanceof DHT)) return new DHT()
  if (process.env.STORAGE_DIR) {
    storageDir = process.env.STORAGE_DIR
  }
  mkdirp.sync(storageDir)
  this.platform = new Platform({
    storage: kadfs(path.join(storageDir, 'platform'))
  })
  this._initializeServices()
}

DHT.prototype._initializeServices = function () {
  this.mdns = new MulticastDNS({
    platform: this.platform,
    storage: kadfs(path.join(storageDir, 'mdns'))
  })
  this.dht = new Kademlia({
    platform: this.platform,
    storage: kadfs(path.join(storageDir, 'dht')),
    seeds: null
  })
}

module.exports = DHT

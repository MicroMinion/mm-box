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
function DHT (directory) {
  if (!(this instanceof DHT)) return new DHT()
  if (directory) {
    storageDir = directory
  } else if (process.env.STORAGE_DIR) {
    storageDir = process.env.STORAGE_DIR
  }
  this.storageDir = storageDir
  mkdirp.sync(this.storageDir)
  var storage = kadfs(path.join(this.storageDir, 'platform'))
  if (process.env.IP_ADDRESS && process.env.PORT) {
    var connectionInfo = [{
      transportType: 'udp',
      transportInfo: {
        address: process.env.IP_ADDRESS,
        port: process.env.PORT
      }
    }, {
      transportType: 'tcp',
      transportInfo: {
        address: process.env.IP_ADDRESS,
        port: process.env.PORT
      }
    }]
  }
  this.platform = new Platform({
    storage: storage,
    connectionInfo: connectionInfo
  })
  this._initializeServices()
}

DHT.prototype._initializeServices = function () {
  this.mdns = new MulticastDNS({
    platform: this.platform,
    storage: kadfs(path.join(this.storageDir, 'mdns'))
  })
  this.dht = new Kademlia({
    platform: this.platform,
    storage: kadfs(path.join(this.storageDir, 'dht')),
    seeds: null
  })
}

module.exports = DHT

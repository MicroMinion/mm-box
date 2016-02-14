if (!global.window) {
  global.window = {}
}

window.location = {
  hostname: require('os').hostname()
}

var kadfs = require('kad-fs')
var Platform = require('../stubs/platform.js')
var Services = require('../src/index.js').services
var _ = require('lodash')

var peers = {}

var createPeer = function (name) {
  var storage = new kadfs('./' + name)
  var platform = new Platform()
  platform.messaging.once('self.profile.ready', function (topic, publicKey, data) {
    console.log('profile ready ' + name)
  })
  var services = {
    profile: new Services.Profile({
      platform: platform,
      storage: storage
    }),
    kademlia: new Services.Kademlia({
      storage: storage,
      platform: platform
    })
  }
  peers[name] = services
}

createPeer('peer-1')
createPeer('peer-2')
// createPeer('peer-3')

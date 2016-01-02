if (!global.window) {
  global.window = {}
}

window.location = {
  hostname: require('os').hostname()
}

var kadfs = require('kad-fs')
var platform = require('flunky-platform')
var _ = require('lodash')

var peers = {}

var createPeer = function (name) {
  var storage = new kadfs('./' + name)
  var messaging = new platform.Messaging({
    storage: storage
  })
  messaging.once('self.profile.ready', function (topic, publicKey, data) {
    console.log('profile ready ') + name
  })
  var services = {
    profile: new platform.services.Profile({
      messaging: messaging,
      storage: storage
    }),
    mdns: new platform.services.mDNS({
      messaging: messaging
    }),
    kademlia: new platform.services.Kademlia({
      storage: storage,
      messaging: messaging
    })
  }
  peers[name] = services
}

createPeer('peer-1')
createPeer('peer-2')
createPeer('peer-3')

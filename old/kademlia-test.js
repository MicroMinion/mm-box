if (!global.window) {
  global.window = {}
}

window.location = {
  hostname: require('os').hostname()
}

var kadfs = require('kad-fs')
var Platform = require('./platform-stub.js')
// var services = require('flunky-services')
var _ = require('lodash')

var peers = {}

var createPeer = function (name) {
  var storage = kadfs('./' + name)
  var platform = new Platform()
  platform.messaging.once('self.profile.ready', function (topic, publicKey, data) {
    console.log('profile ready ' + name)
  })
  peers[name] = {
    profile: new services.BasicProfile({
      platform: platform,
      storage: storage
    }),
    kademlia: new services.Kademlia({
      storage: storage,
      platform: platform
    })
  }
}

createPeer('peer-1')
// createPeer('peer-2')
// createPeer('peer-3')
// createPeer('peer-4')
// createPeer('peer-5')
// createPeer('peer-6')

setTimeout(function () {
  console.log('CONNECTING PEERS')
  _.forEach(peers, function (services, name) {
    console.log(name)
    var connectTo = _.filter(_.keys(peers), function (value) {
      return value !== name
    })
    _.forEach(connectTo, function (n) {
      console.log('  ' + n)
      services.kademlia._setupSeed(peers[n].profile.profile.publicKey, {
        index: peers[n].kademlia.messaging.connectionCount
      })
    })
  })
}, 1000)

setTimeout(function () {
  peers['peer-1'].kademlia.dht.put('test', 'test value', function (err) {
    console.log('callback from put')
    console.log(err)
  })
  setTimeout(function () {
    peers['peer-1'].kademlia.dht.get('test', function (err, value) {
      console.log('callback from get')
      console.log(err)
      console.log(value)
      var buckets = peers['peer-1'].kademlia.dht._router._buckets
      _.forEach(buckets, function (bucket) {
        console.log(bucket._contacts)
      })
    })
  }, 1000 * 5)
}, 1000 * 10)

setTimeout(function () {
  console.log('TIMEOUT')
  process.exit(0)
}, 1000 * 60)

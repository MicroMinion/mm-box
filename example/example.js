var Runtime = require('../index.js')

var peers = {}
var timeout = 0
var TIMEOUT_STEP = 5000

var createPeer = function (name) {
  setTimeout(function () {
    var dht = new Runtime({
      SERVICES: "mdns kademlia",
      LOG_CONTEXT: true
    })
    dht.createPlatform()
    peers[name] = dht
  }, timeout)
  timeout += TIMEOUT_STEP
}

var numberOfPeers = process.argv[2]

for (var i = 1; i <= numberOfPeers; i++) {
  createPeer('peer-' + i)
}

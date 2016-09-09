var Runtime = require('../index.js')

var peers = {}
var timeout = 0
var TIMEOUT_STEP = 1000

var createPeer = function (name) {
  setTimeout(function () {
    var dht = new Runtime({
      SERVICES: "mdns kademlia",
      LOG_CONTEXT: true,
      DEBUG_LEVEL: 0,
      LOGSTASH: false
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

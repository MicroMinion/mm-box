var DHT = require('../index.js')
var winston = require('winston')

var logger = new winston.Logger({
  transports: [
    new winston.transports.Console({
      level: 'debug',
      timestamp: true,
      logstash: true
    })
  ]
})

var peers = {}
var timeout = 0
var TIMEOUT_STEP = 5000

var createPeer = function (name) {
  setTimeout(function () {
    var dht = new DHT({
      logger: logger
    })
    peers[name] = dht
  }, timeout)
  timeout += TIMEOUT_STEP
}

var numberOfPeers = process.argv[2]

for (var i = 1; i <= numberOfPeers; i++) {
  createPeer('peer-' + i)
}

/* setTimeout(function () {
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
*/

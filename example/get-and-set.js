var DHT = require('../index.js')
var winston = require('winston')

var logger = new winston.Logger({
  transports: [
    new winston.transports.Console({
      level: 'info',
      timestamp: true,
      logstash: false
    })
  ]
})

var peers = {}
var timeout = 0
var TIMEOUT_STEP = 2000

var createPeer = function (name) {
  setTimeout(function () {
    var dht = new DHT({
      logger: logger
    })
    peers[name] = dht
  }, timeout)
  timeout += TIMEOUT_STEP
}

var numberOfPeers = 2

for (var i = 1; i <= numberOfPeers; i++) {
  createPeer('peer-' + i)
}

setTimeout(function () {
  peers['peer-1'].dht.dht.put('test', 'test value', function (err) {
    console.log('callback from put for test (stored "test value" as value)')
    console.log('ERROR ' + err)
  })
  setTimeout(function () {
    peers['peer-2'].dht.dht.get('test', function (err, value) {
      console.log('callback from get for test')
      console.log('ERROR ' + err)
      console.log('RESULT ' + value)
    // process.exit(0)
    })
  }, 1000 * 5)
}, 1000 * 10)

var config = require('config')
var KadServer = require('./src/kadserver')
var winston = require('winston')

var dht = KadServer(config)

dht.on('ready', function () {
  dht.testP()
    .catch(function (error) {
      console.error('kadserver test failure. ' + error)
    })
    .done(function () {
      console.log('kadserver ready')
    })
})
dht.on('no peers', function () {
  console.log('no peers, running in bootstrap mode')
})
dht.activate()

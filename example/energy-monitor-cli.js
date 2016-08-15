#!/usr/bin/env node

var Runtime = require('../index.js')
var _ = require('lodash')

var server
var client

var serverKey = process.env.SERVER_KEY
var serverSecret = process.env.SERVER_SECRET

var INTERVAL = 1000 * 60 * 5

var activate = function (devices) {
  _.forEach(devices, function (publicKey) {
    client.platform.messaging.send('serviceManager.activate', publicKey, ['flukso', 'events'])
  })
  subscribe(devices)
}

var subscribe = function (devices) {
  _.forEach(devices, function (publicKey) {
    client.platform.messaging.send('events.subscribe', publicKey, {
      topic: 'flukso.sensor.electricity'
    })
  })
}

var createClientPlatform = function () {
  var environment = {
    SERVICES: 'mdns kademlia devices'
  }
  client = new Runtime(environment)
  client.createPlatform()
  client.platform.on('ready', function () {
    var messaging = client.platform.messaging
    messaging.on('self.devices.update', function (topic, publicKey, data) {
      activate(data)
    })
    messaging.on('self.flukso.sensor.electricity', function (topic, publicKey, data) {
      console.log('ENERGY USAGE ' + data.value)
    })
    messaging.send('devices.updateRequest', 'local', {})
    setImmediate(function () {
      client.services.devices.createTenant(serverKey, serverSecret)
      setInterval(function () {
        messaging.send('devices.updateRequest', 'local', {})
      }, INTERVAL)
    })
  })
}

createClientPlatform()

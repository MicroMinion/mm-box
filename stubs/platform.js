var EventEmitter = require('ak-eventemitter')
var inherits = require('inherits')

var Platform = function () {
  this.messaging = new Messaging()
}

Platform.prototype.enable = function () {}
Platform.prototype.disable = function () {}

var messagers = {}

var connectionCount = 1

var Messaging = function () {
  EventEmitter.call(this, {
    delimiter: '.'
  })
  var messaging = this
  this.profile = undefined
  this.cache = {}
  this.on('self.messaging.connectionInfo', function (topic, publicKey, data) {
    messaging.cache[data.publicKey] = data.connectionInfo.index
  })
  this.on('self.profile.update', function (topic, publicKey, data) {
    messaging.profile = data
    messaging.connectionCount = connectionCount
    messagers[messaging.connectionCount] = messaging
    connectionCount += 1
    process.nextTick(function () {
      messaging.emit('self.messaging.myConnectionInfo', 'local', {publicKey: messaging.profile.publicKey, connectionInfo: {index: messaging.connectionCount}})
    })
  })
}

inherits(Messaging, EventEmitter)

Messaging.prototype.send = function (topic, publicKey, data, options) {
  console.log('Messaging.send')
  var messaging = this
  if (this._isLocal(publicKey)) {
    process.nextTick(function () {
      messaging.emit('self.' + topic, publicKey, data)
    })
    return
  }
  process.nextTick(function () {
    messagers[messaging.cache[publicKey]].emit('public.' + topic, publicKey, data)
  })
}

Messaging.prototype._isLocal = function (publicKey) {
  if (publicKey === 'local') {
    return true
  }
  if (this.profile) {
    return this.profile.publicKey === publicKey
  }
  return false
}

module.exports = Platform

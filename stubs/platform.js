var EventEmitter = require('ak-eventemitter')
var inherits = require('inherits')
var debug = require('debug')('messaging')

var MAX_EXPIRE_TIME = 1000 * 60 * 60 * 24 * 7

var Platform = function () {
  this.messaging = new Messaging()
}

Platform.prototype.enable = function () {}
Platform.prototype.disable = function () {}

var messagers = {}

var Messaging = function () {
  EventEmitter.call(this, {
    delimiter: '.'
  })
  var messaging = this
  this.profile = undefined
  this.on('self.profile.update', function (topic, publicKey, data) {
    messaging.profile = data
    messagers[data.publicKey] = messaging
    process.nextTick(function () {
      messaging.emit('self.messaging.myConnectionInfo', 'local', {publicKey: messaging.profile.publicKey, connectionInfo: {} })
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
    messagers[publicKey].emit('public.' + topic, publicKey, data)
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

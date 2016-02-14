var Q = require('q')
var debug = require('debug')('flunky-dht:services:profile')
var nacl = require('tweetnacl')
var crypto = require('crypto')

nacl.setPRNG(function (x, n) {
  var i
  var v = crypto.randomBytes(n)
  for (i = 0; i < n; i++) x[i] = v[i]
  for (i = 0; i < v.length; i++) v[i] = 0
})

var PUBLISH_INTERVAL = 1000 * 60 * 5

var Profile = function (options) {
  var profile = this
  this.messaging = options.platform.messaging
  this.storage = options.storage
  this.profile = {
    publicKey: null,
    privateKey: null,
  }
  this.loadProfile()
  this.messaging.on('self.profile.updateRequest', function (topic, publicKey, data) {
    profile.update()
  })
}

Profile.prototype.update = function () {
  debug('update')
  if (this.profile.privateKey) {
    this.messaging.send('profile.update', 'local', this.profile)
  }
  console.log(JSON.stringify(this.profile))
  this.storage.put('profile', JSON.stringify(this.profile), function (err) {
    debug('saved profile')
    debug(err)
  })
}

Profile.prototype.loadProfile = function () {
  var profile = this
  var options = {
    success: function (state) {
      state = JSON.parse(state)
      profile.profile = state
      profile.setDefaults()
      profile.update()
      profile.messaging.send('profile.ready', 'local', {})
    },

    error: function (error) {
      debug(error)
      profile.setDefaults()
      profile.messaging.send('profile.ready', 'local', {})
    }
  }
  Q.nfcall(this.storage.get.bind(this.storage), 'profile').then(options.success, options.error)
}

Profile.prototype.setDefaults = function () {
  if (!this.profile.info) {
    this.profile.info = {}
  }
  this.setKeys()
}

Profile.prototype.setKeys = function () {
  debug('setKeys')
  if (!this.profile.privateKey) {
    var keypair = nacl.box.keyPair()
    this.profile.publicKey = nacl.util.encodeBase64(keypair.publicKey)
    this.profile.privateKey = nacl.util.encodeBase64(keypair.secretKey)
    this.update()
  }
}

module.exports = Profile

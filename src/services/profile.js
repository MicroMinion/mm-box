var Q = require('q')
var debug = require('debug')('flunky-dht:services:profile')
var nacl = require('tweetnacl')
nacl.util = require('tweetnacl-util')
var crypto = require('crypto')

nacl.setPRNG(function (x, n) {
  var i
  var v = crypto.randomBytes(n)
  for (i = 0; i < n; i++) x[i] = v[i]
  for (i = 0; i < v.length; i++) v[i] = 0
})

var Profile = function (options) {
  var profile = this
  this.messaging = options.platform.messaging
  this.storage = options.storage
  this.platform = options.platform
  this.profile = {
    publicKey: null,
    privateKey: null
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
    this.platform.setIdentity(this)
  }
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
    },

    error: function (error) {
      debug(error)
      profile.setDefaults()
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
    debug('no private key found')
    var keypair = nacl.box.keyPair()
    debug('generated keypair')
    debug(keypair.publicKey)
    this.profile.publicKey = nacl.util.encodeBase64(keypair.publicKey)
    debug('set public key')
    this.profile.privateKey = nacl.util.encodeBase64(keypair.secretKey)
    debug('before update')
    this.update()
  }
}

Object.defineProperty(Profile.prototype, 'publicKey', {
  get: function () {
    return this.profile.publicKey
  }
})

Object.defineProperty(Profile.prototype, 'privateKey', {
  get: function () {
    return this.profile.privateKey
  }
})

module.exports = Profile

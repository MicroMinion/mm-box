/* global cloudSky */

var _ = require('lodash')
var Q = require('q')
var useragent = require('useragent')
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
  this.collection = {}
  this.collection['profile'] = this.profile.info
  this.messaging.on('self.profile.newCodeNeeded', function (topic, publicKey, data) {
    profile.setCode()
  })
  this.messaging.on('self.profile.updateRequest', function (topic, publicKey, data) {
    profile.update(false)
  })
  this.messaging.on('self.profile.updateInfo', function (topic, publicKey, data) {
    if (_.has(data.info, 'name')) {
      profile.profile.info.name = data.info.name
      profile.collection['profile'].name = data.info.name
    }
    if (_.has(data.info, 'accounts')) {
      profile.profile.info.accounts = data.info.accounts
      profile.collection['profile'].accounts = data.info.accounts
    }
    if (_.has(data.info, 'device')) {
      profile.profile.info.device = data.info.device
      profile.collection['profile'].device = data.info.device
    }
    profile.syncEngine.update('profile')
    profile.updateAuthenticationState()
    profile.update(true)
  })
  this.messaging.on('self.profile.updateType', function (topic, publicKey, data) {
    profile.setType(data.type, data.application)
  })
  this.messaging.on('self.profile.publish', function (topic, publicKey, data) {
    profile.publishUser()
  })
  setInterval(function () {
    if (profile.profile.authenticated) {
      profile.publishUser()
    }
  }, PUBLISH_INTERVAL)
}

Profile.prototype.update = function () {
  if (this.profile.privateKey) {
    this.messaging.send('profile.update', 'local', this.profile)
  }
  this.storage.put('profile', JSON.stringify(this.profile))
}

Profile.prototype.loadProfile = function () {
  var profile = this
  var options = {
    success: function (state) {
      state = JSON.parse(state)
      profile.profile = state
      profile.collection['profile'].name = state.info.name
      profile.collection['profile'].accounts = state.info.accounts
      profile.setDefaults()
      profile.update(false)
      profile.messaging.send('profile.ready', 'local', {})
      profile.publishUser()
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
  this.setDeviceName()
  this.setScan()
  if (!this.profile.code) {
    this.setCode()
  }
}

Profile.prototype.publishUser = function () {
  _.forEach(this.profile.info.accounts, function (account) {
    var key = account.type + ':' + account.id
    this.messaging.send('directory.put', 'local', {key: key, value: this.profile.publicKey})
  }, this)
}

Profile.prototype.setKeys = function () {
  if (!this.profile.privateKey) {
    var keypair = nacl.box.keyPair()
    this.profile.publicKey = nacl.util.encodeBase64(keypair.publicKey)
    this.profile.privateKey = nacl.util.encodeBase64(keypair.secretKey)
    this.update(true)
  }
}

module.exports = Profile

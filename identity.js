'use strict'

var nacl = require('tweetnacl')
nacl.util = require('tweetnacl-util')
var crypto = require('crypto')
var ed2curve = require('ed2curve')
var events = require('events')
var inherits = require('inherits')

nacl.setPRNG(function (x, n) {
  var i
  var v = crypto.randomBytes(n)
  for (i = 0; i < n; i++) x[i] = v[i]
  for (i = 0; i < v.length; i++) v[i] = 0
})

var Identity = function (identity) {
  var secretKey = nacl.util.decodeBase64(identity)
  this.sign = nacl.sign.keyPair.fromSecretKey(secretKey)
  events.EventEmitter.call(this)
}

inherits(Identity, events.EventEmitter)

Identity.prototype.setPlatform = function (platform) {
  this.platform = platform
  this.emit('ready')
}

Identity.prototype.loaded = function () {
  return Boolean(this.sign)
}

Identity.prototype.getSignId = function () {
  return nacl.util.encodeBase64(this.sign.publicKey)
}

Identity.prototype.getBoxId = function () {
  return nacl.util.encodeBase64(ed2curve.convertPublicKey(this.sign.publicKey))
}

Identity.prototype.toMetadata = function () {
  return {
    signId: this.getSignId(),
    boxId: this.getBoxId()
  }
}

Object.defineProperty(Identity.prototype, 'box', {
  get: function () {
    return ed2curve.convertKeyPair(this.sign)
  }
})

module.exports = Identity

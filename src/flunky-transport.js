var debug = require('debug')('flunky-dht:flunky-transport')
var inherits = require('inherits')
var kademlia = require('kad')

/* KADEMLIA CONTACT */

var FlunkyContact = function (options) {
  this.publicKey = options.publicKey
  this.connectionInfo = options.connectionInfo
  kademlia.Contact.call(this, options)
}

inherits(FlunkyContact, kademlia.Contact)

FlunkyContact.prototype._createNodeID = function () {
  return kademlia.utils.createID(this.publicKey)
}

FlunkyContact.prototype.toString = function () {
  return this.publicKey
}

/* KADEMLIA TRANSPORT */

var FlunkyTransport = function (contact, options) {
  debug('initialize FlunkyTransport')
  this.messaging = options.messaging
  kademlia.RPC.call(this, contact, options)
  var self = this
  this.messaging.on('self.kademlia', this._onMessage.bind(this))
  this.messaging.on('friends.kademlia', this._onMessage.bind(this))
  this.messaging.on('public.kademlia', this._onMessage.bind(this))
}

FlunkyTransport.prototype._onMessage = function (topic, publicKey, data) {
  debug('_onMessage')
  data = new Buffer(JSON.stringify(data), 'utf8')
  this._handleMessage(data, {publicKey: publicKey})
}

FlunkyTransport.prototype._createContact = function (options) {
  return new FlunkyContact(options)
}

FlunkyTransport.prototype._send = function (data, contact) {
  debug('_send')
  data = JSON.parse(data.toString('utf8'))
  this.messaging.send('kademlia', contact.publicKey, data, {realtime: true, expireAfter: 10000})
}

FlunkyTransport.prototype._close = function () {}

inherits(FlunkyTransport, kademlia.RPC)

module.exports = {
  FlunkyTransport: FlunkyTransport,
  FlunkyContact: FlunkyContact
}

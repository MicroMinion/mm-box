/**
 * Slightly modified version of the kad-udp-transport code, replacing vanilla udp sockets with a stun-enabled counterpart.
 */

'use strict'

var AddressPortContact = require('../../node_modules/kad/lib/transports/address-port-contact')
var inherits = require('util').inherits
// var dgram = require('dgram')
var nat = require('../nat-stun')
var RPC = require('../../node_modules/kad/lib/rpc')
var winston = require('winston')

inherits(UDPSTUNTransport, RPC)

/**
* Represents an UDP+STUN transport for RPC
* @constructor
* @param {object} contact
*/
function UDPSTUNTransport (contact, options) {
  if (!(this instanceof UDPSTUNTransport)) {
    return new UDPSTUNTransport(contact, options)
  }
  var socketMessageHandler = this._handleMessage.bind(this);
  RPC.call(this, contact, options)
  var self = this

  nat.getStunDgramSocketP(contact.port)
    .then(function (result) {
      var i = 0
      self._socket = result.client
      self._socket.on('message', socketMessageHandler);
      self._port = result.port
      self._publicAddress = result.publicAddress
      self.emit('ready')
    })
    .catch(function (error) {
      throw new Error(error)
    })

/** ORIGINAL SOCKET CREATION CODE
this._socket = dgram.createSocket('udp4', this._handleMessage.bind(this))

this._socket.on('error', function(err) {
  self._log.warn('failed to bind to supplied address %s', contact.address)
  self._log.info('binding to all interfaces as a fallback')
  self._socket.close()

  self._socket = dgram.createSocket('udp4', self._handleMessage.bind(self))

  self._socket.bind(contact.port)
})

this._socket.on('listening', function() {
  self.emit('ready')
})

this._socket.bind(contact.port, contact.address)
*/
}

/**
* Create a UDP Contact
* #_createContact
* @param {object} options
*/
UDPSTUNTransport.prototype._createContact = function (options) {
  return new AddressPortContact(options)
}

/**
* Send a RPC to the given contact
* #_send
* @param {buffer} data
* @param {Contact} contact
*/
UDPSTUNTransport.prototype._send = function (data, contact) {
  winston.debug('[udp-stun transport] send message to ' + JSON.stringify(contact))
  this._socket.send(data, 0, data.length, contact.port, contact.address)
}

/**
* Close the underlying socket
* #_close
*/
UDPSTUNTransport.prototype._close = function () {
  this._socket.close()
}

module.exports = UDPSTUNTransport

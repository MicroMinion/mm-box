'use strict'

var inherits = require('util').inherits
var RPC = require('../node_modules/kad/lib/rpc')

inherits(FakeTransport, RPC)

function FakeTransport (contact, options) {
  if (!(this instanceof FakeTransport)) {
    return new FakeTransport(contact, options)
  }
  console.log('[faketransport] contact: ' + JSON.stringify(contact) + ', options: ' + JSON.stringify(options))

// var self = this
//
// RPC.call(this, contact, options)
//
// this._socket = dgram.createSocket('udp4', this._handleMessage.bind(this))
//
// this._socket.on('error', function(err) {
//   self._log.warn('failed to bind to supplied address %s', contact.address)
//   self._log.info('binding to all interfaces as a fallback')
//   self._socket.close()
//
//   self._socket = dgram.createSocket('udp4', self._handleMessage.bind(self))
//
//   self._socket.bind(contact.port)
// })
//
// this._socket.on('listening', function() {
//   self.emit('ready')
// })
//
// this._socket.bind(contact.port, contact.address)
}

/**
* Send a RPC to the given contact
* #_send
* @param {buffer} data
* @param {number} port
* @param {string} address
*/
FakeTransport.prototype._send = function (data, port, address) {
  console.log('[faketransport] send data: ' + data + ' to ' + address + ':' + port)
// this._socket.send(data, 0, data.length, port, address)
}

/**
* Close the underlying socket
* #_close
*/
FakeTransport.prototype._close = function () {
  console.log('[faketransport] close socket')
// this._socket.close()
}

module.exports = FakeTransport

exports.getStunDgramSocketP = getStunDgramSocketP

var stun = require('stun')
var Q = require('q')
var winston = require('winston')

// Google STUN server
var stunPort = 19302
var stunAddress = 'stun.l.google.com'

function getStunDgramSocketP (port) {
  var deferred = Q.defer()
  var client = stun.connect(stunPort, stunAddress)
  if (port) {
    client._socket.bind(port)
  }
  client.on('error', function (error) {
    winston.error('[nat-stun] failure: ' + error)
    deferred.reject(error)
  })
  client.on('response', function (packet) {
    winston.debug('[nat-stun] receiving STUN packet ' + JSON.stringify(packet))
    var address, port
    if (packet.attrs[stun.attribute.XOR_MAPPED_ADDRESS]) {
      var xorMappedAddress = packet.attrs[stun.attribute.XOR_MAPPED_ADDRESS]
      port = xorMappedAddress.port
      address = xorMappedAddress.address
    } else {
      var mappedAddress = packet.attrs[stun.attribute.MAPPED_ADDRESS]
      port = mappedAddress.port
      address = mappedAddress.address
    }
    deferred.resolve({client: client, publicAddress: address, port: port})
  })
  client.request(function () {
    winston.debug('[nat-stun] sending STUN packet')
  })
  return deferred.promise
}

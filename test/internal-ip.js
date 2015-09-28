exports.getLocalIpAddress = getLocalIpAddress
exports.getLocalIpAddressP = getLocalIpAddressP

var net = require('net')
var Q = require('q')
var winston = require('winston')

function getLocalIpAddress (callback) {
  var socket = net.createConnection(80, 'www.google.com')
  socket.on('connect', function () {
    callback(undefined, socket.address().address)
    socket.end()
  })
  socket.on('error', function (error) {
    callback(error, 'error')
  })
}

function getLocalIpAddressP () {
  var deferred = Q.defer()
  getLocalIpAddress(function (error, address) {
    if (error) {
      winston.error('[internal-ip] could not find active network address.' + error)
      deferred.reject(error)
    } else {
      winston.debug('[internal-ip] found active network address ' + address)
      deferred.resolve(address)
    }
  })
}

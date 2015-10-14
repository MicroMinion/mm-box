exports.getLocalIpAddress = getLocalIpAddress
exports.getLocalIpAddressP = getLocalIpAddressP
exports.getPublicIpAddressP = getPublicIpAddressP

var publicIp = require('public-ip')
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
      winston.error('[ip-addresses] could not find private active IP network address.' + error)
      deferred.reject(error)
    } else {
      winston.debug('[ip-addresses] found private active IP network address ' + address)
      deferred.resolve(address)
    }
  })
}

// returns node's public IP address -- i.e. address visible beyond the latest GW
function getPublicIpAddressP () {
  winston.debug('[ip-addresses] get public IP address request')
  var deferred = Q.defer()
  publicIp(function (error, ip) {
    if (error) {
      winston.error('[ip-addresses] could not determine public IP address. ' + error)
      deferred.reject(error)
    } else {
      winston.debug('[ip-addresses] retrieved public IP address ' + ip)
      deferred.resolve(ip)
    }
  })
  return deferred.promise
}

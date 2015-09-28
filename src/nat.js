exports.getPublicGWAddressP = getPublicGWAddressP
exports.mapPrivateToPublicPortP = mapPrivateToPublicPortP
exports.unmapPrivateToPublicPortP = unmapPrivateToPublicPortP
exports.getPortMappingsP = getPortMappingsP

var merge = require('merge')
var natUPnP = require('nat-upnp')
var Q = require('q')
var winston = require('winston')

var defaultOpts = {}
defaultOpts.ttl = 0
defaultOpts.protocol = 'UDP'
defaultOpts.description = 'flunky'

// returns public IP address of the GW, not your overall public IP address (for instance when GWs are chained)
function getPublicGWAddressP () {
  winston.debug('[nat] get public address request')
  var deferred = Q.defer()
  var client = natUPnP.createClient()
  client.externalIp(function (error, ip) {
    client.close()
    if (error) {
      winston.error('[nat] could not determine public IP address. ' + error)
      deferred.reject(error)
    } else {
      winston.debug('[nat] retrieved public address ' + ip)
      deferred.resolve(ip)
    }
  })
  return deferred.promise
}

function mapPrivateToPublicPortP (args) {
  winston.debug('[nat] port mapping request; args ' + args)
  var deferred = Q.defer()
  if (!args.private.port) {
    winston.error('[nat] private port is undefined')
    deferred.resolve()
  } else {
    args.public.port = args.public.port || args.private.port
    args.private.host = args.private.host || '192.168.1.30'
    var pmargs = merge(defaultOpts, args)
    winston.debug('[nat] executing pmapping request with params ' + JSON.stringify(pmargs))

    var client = natUPnP.createClient()
    client.portMapping(pmargs, function (error) {
      client.close()
      if (error) {
        winston.error('[nat] could not map local port ' + args.private.port + ' to public port ' + args.public.port + '. ' + error)
        deferred.reject(error)
      } else {
        deferred.resolve()
      }
    })
  }
  return deferred.promise
}

function unmapPrivateToPublicPortP (privatePort, privateAddress, publicPort, opts) {
  winston.debug('[nat] unmapping public port ' + publicPort)
  var deferred = Q.defer()
  opts = merge(defaultOpts, opts)
  var pmargs = {}
  pmargs.public = {}
  pmargs.private = {}
  pmargs.public.port = publicPort
  pmargs.private.port = privatePort
  pmargs.private.host = privateAddress
  pmargs = merge(pmargs, opts)
  var client = natUPnP.createClient()
  client.portUnmapping(pmargs, function (error) {
    client.close()
    if (error) {
      winston.error('[nat] could not unmap public port ' + publicPort + '. ' + error)
      deferred.reject(error)
    } else {
      deferred.resolve()
    }
  })
  return deferred.promise
}

function getPortMappingsP () {
  winston.debug('[nat] get port mappings')
  var deferred = Q.defer()
  var client = natUPnP.createClient()
  client.getMappings(function (error, mappings) {
    client.close()
    if (error) {
      winston.error('[nat] could not retrieve port mappings. ' + error)
      deferred.reject(error)
    } else {
      winston.error('[nat] retrieving port mappings ' + mappings)
      deferred.resolve(mappings)
    }
  })
  return deferred.promise
}

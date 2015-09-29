exports.getPublicIpAddressP = getPublicIpAddressP
exports.getPublicGWAddressP = getPublicGWAddressP
exports.mapPrivateToPublicPortP = mapPrivateToPublicPortP
exports.unmapPrivateToPublicPortP = unmapPrivateToPublicPortP
exports.getPortMappingsP = getPortMappingsP
exports.printPortMappings = printPortMappings

var internalIp = require('./internal-ip')
var merge = require('merge')
var natUPnP = require('nat-upnp')
var publicIp = require('public-ip')
var Q = require('q')
var winston = require('winston')

var defaultOpts = {}
defaultOpts.public = {}
defaultOpts.private = {}
defaultOpts.ttl = 0
defaultOpts.protocol = 'UDP'
defaultOpts.description = 'flunky'

// returns node's public IP address -- i.e. address visible beyond the latest GW
function getPublicIpAddressP () {
  winston.debug('[nat] get public IP address request')
  var deferred = Q.defer()
  publicIp(function (error, ip) {
    if (error) {
      winston.error('[nat] could not determine public IP address. ' + error)
      deferred.reject(error)
    } else {
      winston.debug('[nat] retrieved public IP address ' + ip)
      deferred.resolve(ip)
    }
  })
  return deferred.promise
}

// returns public IP address of the GW, not your overall public IP address (for instance when GWs are chained)
function getPublicGWAddressP () {
  winston.debug('[nat] get public GW address request')
  var deferred = Q.defer()
  var client = natUPnP.createClient()
  client.externalIp(function (error, ip) {
    client.close()
    if (error) {
      winston.error('[nat] could not determine public GW address. ' + error)
      deferred.reject(error)
    } else {
      winston.debug('[nat] retrieved public GW address ' + ip)
      deferred.resolve(ip)
    }
  })
  return deferred.promise
}

function mapPrivateToPublicPortP (args) {
  winston.debug('[nat] port mapping request. args = ' + JSON.stringify(args))
  var deferred = Q.defer()

  function executeMapOperation (pmargs) {
    winston.debug('[nat] executing pmapping request with params ' + JSON.stringify(pmargs))
    var client = natUPnP.createClient()
    client.portMapping(pmargs, function (error) {
      client.close()
      if (error) {
        winston.error('[nat] could not map local port ' + args.private.port + ' to public port ' + args.public.port + '. ' + error)
        deferred.reject(error)
      } else {
        deferred.resolve(pmargs)
      }
    })
  }

  if (!args.public.port) {
    var errorMsg = 'public port is undefined'
    winston.error('[nat] ' + errorMsg)
    deferred.reject(new Error(errorMsg))
  } else {
    var pmargs = merge(defaultOpts, args)
    pmargs.private.port = pmargs.private.port || pmargs.public.port
    pmargs.public.host = pmargs.public.host || '*'
    if (!pmargs.private.host) {
      internalIp.getLocalIpAddress(function (error, address) {
        if (error) {
          winston.error('[nat] could not detect local ip address.' + error)
          deferred.reject(error)
        } else {
          pmargs.private.host = address
          executeMapOperation(pmargs)
        }
      })
    } else {
      pmargs.private.host = args.private.host
      executeMapOperation(pmargs)
    }
  }

  return deferred.promise
}

function unmapPrivateToPublicPortP (args) {
  winston.debug('[nat] port un-mapping request. args = ' + JSON.stringify(args))
  var deferred = Q.defer()

  if (!args.public.port) {
    var errorMsg = 'public port is undefined'
    winston.error('[nat] ' + errorMsg)
    deferred.reject(new Error(errorMsg))
  } else {
    var client = natUPnP.createClient()
    client.portUnmapping(args, function (error) {
      client.close()
      if (error) {
        winston.error('[nat] could not unmap public port ' + args.public.port + '. ' + error)
        deferred.reject(error)
      } else {
        deferred.resolve()
      }
    })
  }

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
      winston.debug('[nat] retrieving port mappings ' + JSON.stringify(mappings))
      deferred.resolve(mappings)
    }
  })
  return deferred.promise
}

function printPortMappings () {
  getPortMappingsP()
    .then(function (mappings) {
      console.log(mappings)
    })
}

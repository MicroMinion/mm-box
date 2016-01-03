function _getPublicAddressP (args) {
  var deferred = Q.defer()
  // case 1: we're not located behind a NAT box
  if (!args.nat) {
    winston.debug('[kadserver] node is not located behind NAT device -- no demand to determine public IP address')
    deferred.resolve()
  // case 2: public address is known
  } else if (args.nat.public_address) {
    winston.debug('[kadserver] public address is already set')
    deferred.resolve()
  // case 3: public address can be retrieved from UPnP enabled GW
  } else if (args.nat.type.toLowerCase() === 'upnp') {
    return nat.getPublicGWAddressP()
  // case 4: public address will be retrieved while executing STUN -- so let's get this address using some other tricks
  } else if (args.nat.type.toLowerCase() === 'stun') {
    return ipAddresses.getPublicIpAddressP()
  // case 5: no other options left -- giving up
  } else {
    var msg = "[kadserver] don't know how to retrieve this node's public IP address ..."
    winston.error(msg)
    deferred.reject(new Error(msg))
  }
  return deferred.promise
}

/** Deactivate KAD server
 */
KadServer.prototype.deactivate = function (cb) {
  var self = this
  // port unmapping
  nat.unmapPrivateToPublicPort(self.pmargs)
    .then(function () {
      cb()
    })
    .catch(function (error) {
      winston.error('[kadserver] deactivation of Kad node failed. ' + error)
      cb(error)
    })
}

function _mapPrivateToPublicPortP (args) {
  var deferred = Q.defer()
  if (!args.nat) {
    winston.debug('[kadserver] node is not located behind NAT device -- no demand for portmapping')
    deferred.resolve()
  } else {
    switch (args.nat.type.toLowerCase()) {
      case 'manual':
        // port forwarding is configured manually
        winston.debug('[kadserver] manual port mapping -- no action needed')
        deferred.resolve()
        break
      case 'stun':
        // using UDP+STUN to reach private address
        winston.debug('[kadserver] STUN based port mapping -- no action needed')
        deferred.resolve()
        break
      case 'upnp':
        winston.debug('[kadserver] using nat-upnp to open ports on GW')
        var pmargs = {}
        pmargs.public = {}
        pmargs.private = {}
        pmargs.private.port = args.port
        pmargs.public.port = args.nat.public_port || args.port
        pmargs.protocol = args.transport || 'UDP'
        pmargs.ttl = 0
        pmargs.description = 'flunky:dht'
        return nat.mapPrivateToPublicPortP(pmargs)
      default:
        winston.debug('[kadserver] cannot process nat type ' + args.nat.type)
    }
  }
  return deferred.promise
}

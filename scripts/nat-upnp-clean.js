var argv = require('minimist')(process.argv.slice(2))
var nat = require('../src/nat-upnp')
var Q = require('q')

if (!argv.d) {
  console.log('Please specify nat description regex using -d')
  process.exit()
}

var regex = argv.d

nat.getPortMappingsP()
  .then(function (portMappings) {
    var promises = portMappings.map(function (portMapping) {
      if (portMapping.description.match(regex)) {
        return nat.unmapPrivateToPublicPortP(portMapping)
      }
    })
    return Q.all(promises)
  })
  .catch(function (error) {
    console.error('Failed to remove all nat portmappings matching description ' + regex + '. ' + error)
  })
  .done(function () {
    console.log('Finished removing all nat portmappings matching description ' + regex)
  })

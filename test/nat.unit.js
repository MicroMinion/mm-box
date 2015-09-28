var nat = require('../src/nat')
var publicIp = require('public-ip')
var winston = require('winston')

var chai = require('chai')
var chaiAsPromised = require('chai-as-promised')
var assert = chai.assert
chai.use(chaiAsPromised)
chai.should()

winston.level = 'debug'

var myPublicIpAddress

describe('#NAT', function () {
  before(function (done) {
    publicIp(function (error, ip) {
      if (error) {
        assert(false, 'Could not retrieve public address before running tests. ' + error)
      }
      myPublicIpAddress = ip
      done()
    })
  })
  afterEach(function (done) {
    done()
  })

  it('should return my public ip address', function () {
    return nat.getPublicGWAddressP().should.eventually.equal(myPublicIpAddress)
  })

  it('should map UDP port 9000 to 9000', function () {
    var pmargs = {}
    pmargs.public = {}
    pmargs.private = {}
    pmargs.private.port = 9000
    return nat.mapPrivateToPublicPortP(pmargs).should.be.fulfilled
  })

  it('should map TCP port 9001 to 9001, using custom description and ttl = 2 minutes', function () {
    var pmargs = {}
    pmargs.public = {}
    pmargs.private = {}
    pmargs.private.port = 9001
    pmargs.protocol = 'TCP'
    pmargs.ttl = 120
    pmargs.description = 'funky:test'
    return nat.mapPrivateToPublicPortP(pmargs).should.be.fulfilled
  })

  it('should list port mappings for 9000 and 9001', function () {

  }

  if

})

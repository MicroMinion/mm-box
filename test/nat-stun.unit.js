var ipAddresses = require('../src/ip-addresses')
var nat = require('../src/nat-stun')
var winston = require('winston')

var chai = require('chai')
var chaiAsPromised = require('chai-as-promised')
var assert = chai.assert
var expect = chai.expect
chai.use(chaiAsPromised)
chai.should()

winston.level = 'debug'

var myPublicIpAddress

describe('#NAT', function () {
  this.timeout(10000)

  before(function (done) {
    ipAddresses.getPublicIpAddressP()
      .then(function (ip) {
        myPublicIpAddress = ip
        done()
      })
      .catch(function (error) {
        assert(false, 'Could not retrieve public address before running tests. ' + error)
      })
  })

  it('should return an active stun datagram socket', function () {
    return nat.getStunDgramSocketP()
      .then(function (result) {
        expect(result).to.have.property('client')
        expect(result).to.have.property('publicAddress')
        expect(result).to.have.property('port')
        expect(result.publicAddress).to.equal(myPublicIpAddress)
      })

  //    .should.eventually.equal(myPublicIpAddress)
  })
})

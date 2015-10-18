var dgram = require('dgram')
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

describe('#NAT-STUN', function () {
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

  it('should return an active stun datagram socket', function (done) {
    var listeningPort = 44444
    nat.getStunDgramSocketP(listeningPort)
      .then(function (result) {
        /* test response attributes */
        expect(result).to.have.property('client')
        expect(result).to.have.property('publicAddress')
        expect(result).to.have.property('port')
        expect(result.publicAddress).to.equal(myPublicIpAddress)
        expect(result.port).to.equal(listeningPort)

        /* test communication */

        // test setup
        var sendingSocket = dgram.createSocket('udp4')
        var receivingSocket = result.client
        var testMessageContent = 'stun test'
        var testMessage = new Buffer(testMessageContent)
        var testRuns = 5
        var messagesReceived = 0
        // subscribe to incoming messages
        receivingSocket.on('message', function (msg, rinfo) {
          expect(msg.toString()).to.equal(testMessageContent)
          winston.debug('[node-stun-test] receiving test message ' + msg)
          messagesReceived++
          if (messagesReceived === testRuns) {
            receivingSocket.close()
            sendingSocket.close()
            done()
          }
        })
        // send test message n times
        for (var i = 0; i < testRuns; i++) {
          sendingSocket.send(testMessage, 0, testMessage.length, result.port, result.publicAddress, function (error) {
            if (error) {
              done(error)
            }
            winston.debug('[node-stun-test] test message sent to ' + result.publicAddress  + ':' + result.port)
          })
        }
      })
  })
})

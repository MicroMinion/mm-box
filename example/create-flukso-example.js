
var util = require('mm-create-identity')
var ed2curve = require('ed2curve')
var nacl = require('tweetnacl')
nacl.util = require('tweetnacl-util')

console.log('SERVER ENVIRONMENT VARIABLES')
console.log('')

var identity = util.createIdentity()
var secret = util.createSecret()

console.log('export SERVICES="mdns kademlia tenants"')
console.log('export IDENTITY="' + identity + '"')
console.log('export SECRET="' + secret + '"')

console.log('')

console.log('start mm-box with the above variables set')

console.log('')

console.log('QR CODE IN qr.png file')

util.createQrImageWithSecret(identity, secret, 'qr.png')
console.log('')
console.log('----------------------------')
console.log('CLIENT ENVIRONMENT VARIABLES')
console.log('')
console.log('export SERVER_SECRET="' + secret + '"')

var sign = nacl.sign.keyPair.fromSecretKey(nacl.util.decodeBase64(identity))
var publicKey = nacl.util.encodeBase64(ed2curve.convertKeyPair(sign).publicKey)

console.log('export SERVER_KEY="' + publicKey + '"')

console.log('')

console.log('start examples/energy-monitor-cli.js with the above variables set')

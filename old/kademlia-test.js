var DHT = require('../index.js')

var peers = {}

var createPeer = function (name) {
  var storage = './' + name
  var dht = new DHT(storage)
  peers[name] = dht
}

createPeer('peer-1')
createPeer('peer-2')
// createPeer('peer-3')
// createPeer('peer-4')
// createPeer('peer-5')
// createPeer('peer-6')

/*setTimeout(function () {
  peers['peer-1'].kademlia.dht.put('test', 'test value', function (err) {
    console.log('callback from put')
    console.log(err)
  })
  setTimeout(function () {
    peers['peer-1'].kademlia.dht.get('test', function (err, value) {
      console.log('callback from get')
      console.log(err)
      console.log(value)
      var buckets = peers['peer-1'].kademlia.dht._router._buckets
      _.forEach(buckets, function (bucket) {
        console.log(bucket._contacts)
      })
    })
  }, 1000 * 5)
}, 1000 * 10)

setTimeout(function () {
  console.log('TIMEOUT')
  process.exit(0)
}, 1000 * 60)
*/

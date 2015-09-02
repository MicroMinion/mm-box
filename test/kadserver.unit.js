var assert = require('chai').assert;
var crypto = require('crypto');
var expect = require('chai').expect;
var KadServer = require('../src/kadserver');
var FakeStorage = require('./fakestorage');

var publicIpAddress = '94.227.154.171';

var logLevel = Number(process.env.LOG_LEVEL);

var storage1 = new FakeStorage('node1');
var storage2 = new FakeStorage('node2');
var storage3 = new FakeStorage('node3');

var node1opts = {
  address: '127.0.0.1',
  port: 65535,
  seeds: [],
  storage: storage1,
  logLevel: logLevel
};

var node2opts = {
  address: '127.0.0.1',
  port: 65534,
  seeds: [{
    address: '127.0.0.1',
    port: 65535
  }],
  storage: storage2,
  logLevel: logLevel
};

var node3opts = {
  address: '127.0.0.1',
  port: 65533,
  seeds: [{
    address: '127.0.0.1',
    port: 65534
  }],
  storage: storage3,
  logLevel: logLevel
};

var node1 = new KadServer(node1opts);
var node2 = new KadServer(node2opts);
var node3 = new KadServer(node3opts);

var key = 'ping';
var value1 = 'pong';
var value2 = 'pang';
var value3 = 'pung';
var ttl = 1;

function _createID(data) {
  return crypto.createHash('sha1').update(data).digest('hex');
};

function _printStorage123() {
  console.log('FakeStorage 1: ' + JSON.stringify(storage1.data));
  console.log('FakeStorage 2: ' + JSON.stringify(storage2.data));
  console.log('FakeStorage 3: ' + JSON.stringify(storage3.data));
};

describe('#localhost', function() {

  it('kadserver should launch localhost bootstrap server', function(done) {
    node1.on('ready', function() {
      assert(false, 'Ready event should not be fired since there are no seeds specified.');
    });
    node1.on('no peers', function() {
      assert(true, 'Bootstrap server running');
      done();
    });
    node1.activate();
  });

  it('kadserver should launch local overlay network', function(done) {
    node2.on('no peers', function() {
      assert(false, 'Node 2 could not connect to peer ' + JSON.stringify(node2opts.seeds));
    });
    node2.on('ready', function() {
      assert(true, 'Node 2 is connected to peer ' + JSON.stringify(node2opts.seeds));
      //launch node 3
      node3 = KadServer(node3opts);
      node3.on('no peers', function() {
        assert(false, 'Node 3 could not connect to peers ' + JSON.stringify(node3opts.seeds));
      });
      node3.on('ready', function() {
        assert(true, 'Node 3 is connected to peers ' + JSON.stringify(node3opts.seeds));
        done();
      });
      node3.activate();
    });
    node2.activate();
  });

  it('kadserver should write to store', function(done) {
    node2.put(key, value1)
      .then(function() {
        assert(true, 'Stored KV [' + key + ',' + value1 + ']');
        expect(storage3.data).to.have.property(_createID(key));
        expect(storage2.data).to.not.have.property(_createID(key));
        expect(storage1.data).to.have.property(_createID(key));
        done();
      })
      .catch(function(error) {
        assert(false, 'Unable to succesfully write to the DHT');
      });
  });

  it('kadserver should read from store', function(done) {
    node3.get(key)
      .then(function(storedValue) {
        expect(storedValue).to.equal(value1);
        done();
      })
      .catch(function(error) {
        assert(false, 'Unable to succesfully read from the DHT');
      });
  });

  it('kadserver should overwrite KV tuple', function(done) {
    node3.put(key, value2)
      .then(function() {
        assert(true, 'Stored KV [' + key + ',' + value2 + ']');
        return node2.get(key);
      })
      .then(function(storedValue) {
        expect(storedValue).to.not.equal(value1);
        expect(storedValue).to.equal(value2);
        done();
      })
      .catch(function(error) {
        assert(false, 'Unable to succesfully overwrite a KV tuple in the DHT');
      });
  });

  it('kadserver should delete from store', function(done) {
    node2.del(key)
      .then(function() {
        return node3.get(key);
      })
      .then(function(storedValue) {
        expect(storedValue).to.be.null;
        done();
      })
      .catch(function(error) {
        assert(false, 'Unable to succesfully delete from the DHT');
      });
  });

  it('kadserver should write KV with TTL to store', function(done) {
    node2.put(key, value3, ttl)
      .then(function() {
        assert(true, 'Stored KV [' + key + ',' + value3 + ', ttl=' + ttl + ']');
        var storedData = JSON.parse(storage3.data[_createID(key)]).value;
        expect(storedData).to.have.property('expires');
        expect(storedData.expires).to.not.be.null;

        done();
      })
      .catch(function(error) {
        assert(false, 'Unable to succesfully write KV tuple with TTL to the DHT');
      });
  });

  it('kadserver should delete value after TTL expires', function(done) {
    setTimeout(function(){
      node3.get(key)
      .then(function(storedValue) {
        expect(storedValue).to.be.null;
        done();
      })
      .catch(function(error) {
        assert(false, 'Unable to remove expired data from the DHT');
      });
    }, 1000);
  });

});


// describe('#NAT: KadServer', function() {
//
//   it('should launch NATed bootstrap server + open NAT port through UPnP', function(done) {
//     var opts = {
//       address: '0.0.0.0',
//       port: 65531,
//       nat: {
//         address: publicIpAddress,
//         port: 65530
//       },
//       seeds: [],
//       storage: new FakeStorage()
//     };
//     var server = KadServer(opts);
//     server.on('error', function() {
//       assert(false, 'Error while activating bootstrap server: ' + error);
//     });
//     server.on('ready', function() {
//       assert(false, 'Ready event should not be fired since there are no seeds specified.');
//     });
//     server.on('no peers', function() {
//       assert(true, 'bootstrap server running');
//       done();
//     });
//     server.activate();
//   });
//
//   it('should launch NATed bootstrap server + retrieve public address', function(done) {
//     var opts = {
//       address: '0.0.0.0',
//       port: 65530,
//       nat: {
//         port: 65529
//       },
//       seeds: [],
//       storage: new FakeStorage()
//     };
//     var server = KadServer(opts);
//     server.on('error', function() {
//       assert(false, 'Error while activating bootstrap server: ' + error);
//     });
//     server.on('ready', function() {
//       assert(false, 'Ready event should not be fired since there are no seeds specified.');
//     });
//     server.on('no peers', function() {
//       assert(true, 'bootstrap server running');
//       done();
//     });
//     server.activate();
//   });
//
//   it('should launch NATed overlay network', function(done) {
//     // node 1 -- bootstrap node
//     var node1opts = {
//       address: '0.0.0.0',
//       port: 65528,
//       nat: {
//         port: 65528
//       },
//       seeds: [],
//       storage: new FakeStorage()
//     };
//     // node 2
//     var node2opts = {
//       address: '0.0.0.0',
//       port: 65527,
//       nat: {
//         port: 65527
//       },
//       seeds: [{
//         address: publicIpAddress,
//         port: 65528
//       }],
//       storage: new FakeStorage()
//     };
//     // node 3
//     var node3opts = {
//       address: '0.0.0.0',
//       port: 65526,
//       nat: {
//         port: 65526
//       },
//       seeds: [{
//         address: publicIpAddress,
//         port: 65528
//       }, {
//         address: publicIpAddress,
//         port: 65527
//       }],
//       storage: new FakeStorage()
//     };
//     // launch node 1
//     var node1 = KadServer(node1opts);
//     node1.on('error', function() {
//       assert(false, 'Error while activating node 1: ' + error);
//     });
//     node1.on('ready', function() {
//       assert(false, 'Ready event should not be fired since there are no seeds specified.');
//     });
//     node1.on('no peers', function() {
//       assert(true, 'Bootstrap server running behind NAT box');
//       // launch node 2
//       var node2 = KadServer(node2opts);
//       node2.on('error', function() {
//         assert(false, 'Error while activating node 2: ' + error);
//       });
//       node2.on('no peers', function() {
//         assert(false, 'Node 2 could not connect to NAT peer ' + JSON.stringify(node2opts.seeds));
//       });
//       node2.on('ready', function() {
//         assert(true, 'Node 2 is connected to NAT peer ' + JSON.stringify(node2opts.seeds));
//         // launch node 3
//         var node3 = KadServer(node3opts);
//         node3.on('error', function() {
//           assert(false, 'Error while activating node 3: ' + error);
//         });
//         node3.on('no peers', function() {
//           assert(false, 'Node 3 could not connect to NAT peers ' + JSON.stringify(node3opts.seeds));
//         });
//         node3.on('ready', function() {
//           assert(true, 'Node 3 is connected to NAT peers ' + JSON.stringify(node3opts.seeds));
//           done();
//         });
//         node3.activate();
//       });
//       node2.activate();
//     });
//     node1.activate();
//   });
//
//   it('should write and read to/from store in NAT setup', function(done) {
//     var key = 'ping'
//     var value = 'pong'
//       // node 1 -- bootstrap node
//     var node1opts = {
//       address: '0.0.0.0',
//       port: 65522,
//       seeds: [],
//       storage: new FakeStorage()
//     };
//     // node 2
//     var node2opts = {
//       address: '0.0.0.0',
//       port: 65521,
//       seeds: [{
//         address: publicIpAddress,
//         port: 65522
//       }],
//       storage: new FakeStorage()
//     };
//     // node 3
//     var node3opts = {
//       address: '0.0.0.0',
//       port: 65520,
//       seeds: [{
//         address: publicIpAddress,
//         port: 65522
//       }, {
//         address: publicIpAddress,
//         port: 65521
//       }],
//       storage: new FakeStorage()
//     };
//     // test write-read operations
//     var testWriteRead = function(node, key, value, onSuccess) {
//         node.put(key, value)
//           .then(function() {
//             assert(true, 'Stored KV [' + key + ',' + value + ']');
//             return node.get(key);
//           })
//           .then(function(storedValue) {
//             if (storedValue != value) {
//               assert(false, 'Expected to get value ' + value + ', instead retrieved ' + storedValue);
//             } else {
//               assert(true, 'Retrieved value ' + value + ' for key ' + key);
//               onSuccess();
//             }
//           })
//           .catch(function(error) {
//             assert(false, 'Unable to succesfully write and read to/from the DHT');
//           });
//       }
//       // launch node 1
//     var node1 = KadServer(node1opts);
//     node1.on('ready', function() {
//       assert(false, 'Ready event should not be fired since there are no seeds specified.');
//     });
//     node1.on('no peers', function() {
//       assert(true, 'Bootstrap server running');
//       // launch node 2
//       var node2 = KadServer(node2opts);
//       node2.on('no peers', function() {
//         assert(false, 'Node 2 could not connect to peer ' + JSON.stringify(node2opts.seeds));
//       });
//       node2.on('ready', function() {
//         assert(true, 'Node 2 is connected to peer ' + JSON.stringify(node2opts.seeds));
//         // launch node 3
//         var node3 = KadServer(node3opts);
//         node3.on('no peers', function() {
//           assert(false, 'Node 3 could not connect to peers ' + JSON.stringify(node3opts.seeds));
//         });
//         node3.on('ready', function() {
//           assert(true, 'Node 3 is connected to peers ' + JSON.stringify(node3opts.seeds));
//           testWriteRead(node2, key, value, function() {
//             testWriteRead(node3, key, value, function() {
//               done();
//             });
//           });
//         });
//         node3.activate();
//       });
//       node2.activate();
//     });
//     node1.activate();
//   });
// });

var assert = require('chai').assert;
var KadServer = require('../src/kadserver');
var FakeStorage = require('./fakestorage');

var publicIpAddress = '94.227.154.171';

describe('KadServer', function() {

  describe('#Localhost', function() {

    it('should launch localhost bootstrap server', function(done) {
      var opts = {
        address: '0.0.0.0',
        port: 65535,
        seeds: [],
        storage: new FakeStorage()
      };
      var server = new KadServer(opts);
      server.on('ready', function() {
        assert(false, 'Ready event should not be fired since there are no seeds specified.');
      });
      server.on('no peers', function() {
        assert(true, 'Bootstrap server running');
        done();
      });
      server.activate();
    });

    it('should launch local overlay network', function(done) {
      // node 1 -- bootstrap node
      var node1opts = {
        address: '0.0.0.0',
        port: 65534,
        seeds: [],
        storage: new FakeStorage()
      };
      // node 2
      var node2opts = {
        address: '0.0.0.0',
        port: 65533,
        seeds: [{
          address: '127.0.0.1',
          port: 65534
        }],
        storage: new FakeStorage()
      };
      // node 3
      var node3opts = {
        address: '0.0.0.0',
        port: 65532,
        seeds: [{
          address: '127.0.0.1',
          port: 65534
        }, {
          address: '127.0.0.1',
          port: 65533
        }],
        storage: new FakeStorage()
      };
      // launch node 1
      var node1 = KadServer(node1opts);
      node1.on('ready', function() {
        assert(false, 'Ready event should not be fired since there are no seeds specified.');
      });
      node1.on('no peers', function() {
        assert(true, 'Bootstrap server running');
        // launch node 2
        var node2 = KadServer(node2opts);
        node2.on('no peers', function() {
          assert(false, 'Node 2 could not connect to peer ' + JSON.stringify(node2opts.seeds));
        });
        node2.on('ready', function() {
          assert(true, 'Node 2 is connected to peer ' + JSON.stringify(node2opts.seeds));
          // launch node 3
          var node3 = KadServer(node3opts);
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
      node1.activate();
    });

    it('should write and read to/from store', function(done) {
      var key = 'ping';
      var value = 'pong';
      // node 1 -- bootstrap node
      var node1opts = {
        address: '0.0.0.0',
        port: 65525,
        seeds: [],
        storage: new FakeStorage()
      };
      // node 2
      var node2opts = {
        address: '0.0.0.0',
        port: 65524,
        seeds: [{
          address: '127.0.0.1',
          port: 65525
        }],
        storage: new FakeStorage()
      };
      // node 3
      var node3opts = {
        address: '0.0.0.0',
        port: 65523,
        seeds: [{
          address: '127.0.0.1',
          port: 65525
        }, {
          address: '127.0.0.1',
          port: 65524
        }],
        storage: new FakeStorage()
      };
      // test write-read operations
      var testWriteRead = function(node, key, value, onSuccess) {
        node.put(key, value)
          .then(function() {
            assert(true, 'Stored KV [' + key + ',' + value + ']');
            return node.get(key);
          })
          .then(function(storedValue) {
            if (storedValue != value) {
              assert(false, 'Expected to get value ' + value + ', instead retrieved ' + storedValue);
            } else {
              assert(true, 'Retrieved value ' + value + ' for key ' + key);
              onSuccess();
            }
          })
          .catch(function(error) {
            assert(false, 'Unable to succesfully write and read to/from the DHT');
          });
      };

      // launch node 1
      var node1 = KadServer(node1opts);
      node1.on('ready', function() {
        assert(false, 'Ready event should not be fired since there are no seeds specified.');
      });
      node1.on('no peers', function() {
        assert(true, 'Bootstrap server running');
        // launch node 2
        var node2 = KadServer(node2opts);
        node2.on('no peers', function() {
          assert(false, 'Node 2 could not connect to peer ' + JSON.stringify(node2opts.seeds));
        });
        node2.on('ready', function() {
          assert(true, 'Node 2 is connected to peer ' + JSON.stringify(node2opts.seeds));
          // launch node 3
          var node3 = KadServer(node3opts);
          node3.on('no peers', function() {
            assert(false, 'Node 3 could not connect to peers ' + JSON.stringify(node3opts.seeds));
          });
          node3.on('ready', function() {
            assert(true, 'Node 3 is connected to peers ' + JSON.stringify(node3opts.seeds));
            testWriteRead(node2, key, value, function() {
              testWriteRead(node3, key, value, function() {
                done();
              });
            });
          });
          node3.activate();
        });
        node2.activate();
      });
      node1.activate();
    });
  });

  describe('#NAT', function() {

    it('should launch NATed bootstrap server + open NAT port through UPnP', function(done) {
      var opts = {
        address: '0.0.0.0',
        port: 65531,
        nat: {
          address: publicIpAddress,
          port: 65530
        },
        seeds: [],
        storage: new FakeStorage()
      };
      var server = KadServer(opts);
      server.on('error', function() {
        assert(false, 'Error while activating bootstrap server: ' + error);
      });
      server.on('ready', function() {
        assert(false, 'Ready event should not be fired since there are no seeds specified.');
      });
      server.on('no peers', function() {
        assert(true, 'bootstrap server running');
        done();
      });
      server.activate();
    });

    it('should launch NATed bootstrap server + retrieve public address', function(done) {
      var opts = {
        address: '0.0.0.0',
        port: 65530,
        nat: {
          port: 65529
        },
        seeds: [],
        storage: new FakeStorage()
      };
      var server = KadServer(opts);
      server.on('error', function() {
        assert(false, 'Error while activating bootstrap server: ' + error);
      });
      server.on('ready', function() {
        assert(false, 'Ready event should not be fired since there are no seeds specified.');
      });
      server.on('no peers', function() {
        assert(true, 'bootstrap server running');
        done();
      });
      server.activate();
    });

    it('should launch NATed overlay network', function(done) {
      // node 1 -- bootstrap node
      var node1opts = {
        address: '0.0.0.0',
        port: 65528,
        nat: {
          port: 65528
        },
        seeds: [],
        storage: new FakeStorage()
      };
      // node 2
      var node2opts = {
        address: '0.0.0.0',
        port: 65527,
        nat: {
          port: 65527
        },
        seeds: [{
          address: publicIpAddress,
          port: 65528
        }],
        storage: new FakeStorage()
      };
      // node 3
      var node3opts = {
        address: '0.0.0.0',
        port: 65526,
        nat: {
          port: 65526
        },
        seeds: [{
          address: publicIpAddress,
          port: 65528
        }, {
          address: publicIpAddress,
          port: 65527
        }],
        storage: new FakeStorage()
      };
      // launch node 1
      var node1 = KadServer(node1opts);
      node1.on('error', function() {
        assert(false, 'Error while activating node 1: ' + error);
      });
      node1.on('ready', function() {
        assert(false, 'Ready event should not be fired since there are no seeds specified.');
      });
      node1.on('no peers', function() {
        assert(true, 'Bootstrap server running behind NAT box');
        // launch node 2
        var node2 = KadServer(node2opts);
        node2.on('error', function() {
          assert(false, 'Error while activating node 2: ' + error);
        });
        node2.on('no peers', function() {
          assert(false, 'Node 2 could not connect to NAT peer ' + JSON.stringify(node2opts.seeds));
        });
        node2.on('ready', function() {
          assert(true, 'Node 2 is connected to NAT peer ' + JSON.stringify(node2opts.seeds));
          // launch node 3
          var node3 = KadServer(node3opts);
          node3.on('error', function() {
            assert(false, 'Error while activating node 3: ' + error);
          });
          node3.on('no peers', function() {
            assert(false, 'Node 3 could not connect to NAT peers ' + JSON.stringify(node3opts.seeds));
          });
          node3.on('ready', function() {
            assert(true, 'Node 3 is connected to NAT peers ' + JSON.stringify(node3opts.seeds));
            done();
          });
          node3.activate();
        });
        node2.activate();
      });
      node1.activate();
    });

    it('should write and read to/from store in NAT setup', function(done) {
      var key = 'ping'
      var value = 'pong'
        // node 1 -- bootstrap node
      var node1opts = {
        address: '0.0.0.0',
        port: 65522,
        seeds: [],
        storage: new FakeStorage()
      };
      // node 2
      var node2opts = {
        address: '0.0.0.0',
        port: 65521,
        seeds: [{
          address: publicIpAddress,
          port: 65522
        }],
        storage: new FakeStorage()
      };
      // node 3
      var node3opts = {
        address: '0.0.0.0',
        port: 65520,
        seeds: [{
          address: publicIpAddress,
          port: 65522
        }, {
          address: publicIpAddress,
          port: 65521
        }],
        storage: new FakeStorage()
      };
      // test write-read operations
      var testWriteRead = function(node, key, value, onSuccess) {
          node.put(key, value)
            .then(function() {
              assert(true, 'Stored KV [' + key + ',' + value + ']');
              return node.get(key);
            })
            .then(function(storedValue) {
              if (storedValue != value) {
                assert(false, 'Expected to get value ' + value + ', instead retrieved ' + storedValue);
              } else {
                assert(true, 'Retrieved value ' + value + ' for key ' + key);
                onSuccess();
              }
            })
            .catch(function(error) {
              assert(false, 'Unable to succesfully write and read to/from the DHT');
            });
        }
        // launch node 1
        var node1 = KadServer(node1opts);
        node1.on('ready', function() {
          assert(false, 'Ready event should not be fired since there are no seeds specified.');
        });
        node1.on('no peers', function() {
          assert(true, 'Bootstrap server running');
          // launch node 2
          var node2 = KadServer(node2opts);
          node2.on('no peers', function() {
            assert(false, 'Node 2 could not connect to peer ' + JSON.stringify(node2opts.seeds));
          });
          node2.on('ready', function() {
            assert(true, 'Node 2 is connected to peer ' + JSON.stringify(node2opts.seeds));
            // launch node 3
            var node3 = KadServer(node3opts);
            node3.on('no peers', function() {
              assert(false, 'Node 3 could not connect to peers ' + JSON.stringify(node3opts.seeds));
            });
            node3.on('ready', function() {
              assert(true, 'Node 3 is connected to peers ' + JSON.stringify(node3opts.seeds));
              //testWriteRead(node1, key, value, function() {
              testWriteRead(node2, key, value, function() {
                testWriteRead(node3, key, value, function() {
                  done();
                });
              });
              //});
            });
            node3.activate();
          });
          node2.activate();
        });
        node1.activate();
      });
    });
  });

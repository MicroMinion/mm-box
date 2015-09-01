var rimraf = require('rimraf');
var test = require('tape');
var KadServer = require('../src/kadserver');

var publicIpAddress = '94.227.154.171';

test('launch localhost bootstrap server', function (t) {
  var opts = {
    address: '0.0.0.0',
    port: 65535,
    seeds: [],
    storage: './test-db'
  };
  var server = KadServer(opts);
  server.on('ready', function () {
    t.fail('Ready event should not be fired since there are no seeds specified.');
  });
  server.on('no peers', function() {
    t.pass('bootstrap server running');
    // rm -rf ./test-db
    rimraf(opts.storage, function() {
      t.end();
    });
  });
  server.activate();
});

test('launch local overlay network', function (t) {
  // node 1 -- bootstrap node
  var node1opts = {
    address: '0.0.0.0',
    port: 65534,
    seeds: [],
    storage: './test-db-1'
  };
  // node 2
  var node2opts = {
    address: '0.0.0.0',
    port: 65533,
    seeds: [
      {
        address: '127.0.0.1',
        port: 65534
      }
    ],
    storage: './test-db-2'
  };
  // node 3
  var node3opts = {
    address: '0.0.0.0',
    port: 65532,
    seeds: [
      {
        address: '127.0.0.1',
        port: 65534
      },
      {
        address: '127.0.0.1',
        port: 65533
      }
    ],
    storage: './test-db-3'
  };
  // cleanup created storage folders
  var cleanUpStorageFolders = function(onComplete) {
    rimraf(node1opts.storage, function() {
      rimraf(node2opts.storage, function() {
        rimraf(node3opts.storage, function() {
          onComplete();
        });
      });
    });
  };
  // launch node 1
  var node1 = KadServer(node1opts);
  node1.on('ready', function () {
    t.fail('Ready event should not be fired since there are no seeds specified.');
  });
  node1.on('no peers', function() {
    t.pass('Bootstrap server running');
    // launch node 2
    var node2 = KadServer(node2opts);
    node2.on('no peers', function() {
      t.fail('Node 2 could not connect to peer ' + JSON.stringify(node2opts.seeds));
    });
    node2.on('ready', function() {
      t.pass('Node 2 is connected to peer ' + JSON.stringify(node2opts.seeds));
      // launch node 3
      var node3 = KadServer(node3opts);
      node3.on('no peers', function() {
        t.fail('Node 3 could not connect to peers ' + JSON.stringify(node3opts.seeds));
      });
      node3.on('ready', function() {
        t.pass('Node 3 is connected to peers ' + JSON.stringify(node3opts.seeds));
        cleanUpStorageFolders(function() {
          t.end();
        });
      });
      node3.activate();
    });
    node2.activate();
  });
  node1.activate();
});

test('launch NATed bootstrap server + open NAT port through UPnP', function (t) {
  var opts = {
    address: '0.0.0.0',
    port: 65531,
    nat: {
      address: publicIpAddress,
      port: 65530
    },
    seeds: [],
    storage: './test-db-4'
  };
  var server = KadServer(opts);
  server.on('ready', function () {
    t.fail('Ready event should not be fired since there are no seeds specified.');
  });
  server.on('no peers', function() {
    t.pass('bootstrap server running');
    // rm -rf ./test-db
    rimraf(opts.storage, function() {
      t.end();
    });
  });
  server.activate();
});

test('launch NATed bootstrap server + retrieve public address', function (t) {
  var opts = {
    address: '0.0.0.0',
    port: 65530,
    nat: {
      port: 65529
    },
    seeds: [],
    storage: './test-db-5'
  };
  var server = KadServer(opts);
  server.on('ready', function () {
    t.fail('Ready event should not be fired since there are no seeds specified.');
  });
  server.on('no peers', function() {
    t.pass('bootstrap server running');
    // rm -rf ./test-db
    rimraf(opts.storage, function() {
      t.end();
    });
  });
  server.activate();
});

test('launch NATed overlay network', function (t) {
  // node 1 -- bootstrap node
  var node1opts = {
    address: '0.0.0.0',
    port: 65528,
    nat: {
      port: 65528
    },
    seeds: [],
    storage: './test-db-6'
  };
  // node 2
  var node2opts = {
    address: '0.0.0.0',
    port: 65527,
    nat: {
      port: 65527
    },
    seeds: [
      {
        address: publicIpAddress,
        port: 65528
      }
    ],
    storage: './test-db-7'
  };
  // node 3
  var node3opts = {
    address: '0.0.0.0',
    port: 65526,
    nat: {
      port: 65526
    },
    seeds: [
      {
        address: publicIpAddress,
        port: 65528
      },
      {
        address: publicIpAddress,
        port: 65527
      }
    ],
    storage: './test-db-8'
  };
  // cleanup created storage folders
  var cleanUpStorageFolders = function(onComplete) {
    rimraf(node1opts.storage, function() {
      rimraf(node2opts.storage, function() {
        rimraf(node3opts.storage, function() {
          onComplete();
        });
      });
    });
  };
  // launch node 1
  var node1 = KadServer(node1opts);
  node1.on('ready', function () {
    t.fail('Ready event should not be fired since there are no seeds specified.');
  });
  node1.on('no peers', function() {
    t.pass('Bootstrap server running behind NAT box');
    // launch node 2
    var node2 = KadServer(node2opts);
    node2.on('no peers', function() {
      t.fail('Node 2 could not connect to NAT peer ' + JSON.stringify(node2opts.seeds));
    });
    node2.on('ready', function() {
      t.pass('Node 2 is connected to NAT peer ' + JSON.stringify(node2opts.seeds));
      // launch node 3
      var node3 = KadServer(node3opts);
      node3.on('no peers', function() {
        t.fail('Node 3 could not connect to NAT peers ' + JSON.stringify(node3opts.seeds));
      });
      node3.on('ready', function() {
        t.pass('Node 3 is connected to NAT peers ' + JSON.stringify(node3opts.seeds));
        cleanUpStorageFolders(function() {
          t.end();
        });
      });
      node3.activate();
    });
    node2.activate();
  });
  node1.activate();
});

test('test basic write and read operation', function (t) {
  var key = 'ping'
  var value = 'pong'
  // node 1 -- bootstrap node
  var node1opts = {
    address: '0.0.0.0',
    port: 65525,
    seeds: [],
    storage: './test-db-9'
  };
  // node 2
  var node2opts = {
    address: '0.0.0.0',
    port: 65524,
    seeds: [
      {
        address: '127.0.0.1',
        port: 65525
      }
    ],
    storage: './test-db-10'
  };
  // node 3
  var node3opts = {
    address: '0.0.0.0',
    port: 65523,
    seeds: [
      {
        address: '127.0.0.1',
        port: 65525
      },
      {
        address: '127.0.0.1',
        port: 65524
      }
    ],
    storage: './test-db-11'
  };
  // test write-read operations
  var testWriteRead = function (node, key, value, onSuccess) {
    node.put(key, value)
    .then(function() {
      t.pass('Stored KV [' + key + ',' + value + ']');
      return node.get(key);
    })
    .then(function(storedValue){
      if (storedValue != value) {
        t.fail('Expected to get value ' + value + ', instead retrieved ' + storedValue);
      } else {
        t.pass('Retrieved value ' + value + ' for key ' + key);
        onSuccess();
      }
    })
    .catch(function (error) {
      t.fail('Unable to succesfully write and read to/from the DHT');
    });
  }
  // cleanup created storage folders
  var cleanUpStorageFolders = function(onComplete) {
    rimraf(node1opts.storage, function() {
      rimraf(node2opts.storage, function() {
        rimraf(node3opts.storage, function() {
          onComplete();
        });
      });
    });
  };
  // launch node 1
  var node1 = KadServer(node1opts);
  node1.on('ready', function () {
    t.fail('Ready event should not be fired since there are no seeds specified.');
  });
  node1.on('no peers', function() {
    t.pass('Bootstrap server running');
    // launch node 2
    var node2 = KadServer(node2opts);
    node2.on('no peers', function() {
      t.fail('Node 2 could not connect to peer ' + JSON.stringify(node2opts.seeds));
    });
    node2.on('ready', function() {
      t.pass('Node 2 is connected to peer ' + JSON.stringify(node2opts.seeds));
      // launch node 3
      var node3 = KadServer(node3opts);
      node3.on('no peers', function() {
        t.fail('Node 3 could not connect to peers ' + JSON.stringify(node3opts.seeds));
      });
      node3.on('ready', function() {
        t.pass('Node 3 is connected to peers ' + JSON.stringify(node3opts.seeds));
//        testWriteRead(node1, key, value, function() {
          testWriteRead(node2, key, value, function() {
            testWriteRead(node3, key, value, function() {
              cleanUpStorageFolders(function() {
                t.end();
              });
            });
          });
//        });
      });
      node3.activate();
    });
    node2.activate();
  });
  node1.activate();
});

test('test basic write and read operation in NAT setup', function (t) {
  var key = 'ping'
  var value = 'pong'
  // node 1 -- bootstrap node
  var node1opts = {
    address: '0.0.0.0',
    port: 65522,
    seeds: [],
    storage: './test-db-12'
  };
  // node 2
  var node2opts = {
    address: '0.0.0.0',
    port: 65521,
    seeds: [
      {
        address: publicIpAddress,
        port: 65522
      }
    ],
    storage: './test-db-13'
  };
  // node 3
  var node3opts = {
    address: '0.0.0.0',
    port: 65520,
    seeds: [
      {
        address: publicIpAddress,
        port: 65522
      },
      {
        address: publicIpAddress,
        port: 65521
      }
    ],
    storage: './test-db-14'
  };
  // test write-read operations
  var testWriteRead = function (node, key, value, onSuccess) {
    node.put(key, value)
    .then(function() {
      t.pass('Stored KV [' + key + ',' + value + ']');
      return node.get(key);
    })
    .then(function(storedValue){
      if (storedValue != value) {
        t.fail('Expected to get value ' + value + ', instead retrieved ' + storedValue);
      } else {
        t.pass('Retrieved value ' + value + ' for key ' + key);
        onSuccess();
      }
    })
    .catch(function (error) {
      t.fail('Unable to succesfully write and read to/from the DHT');
    });
  }
  // cleanup created storage folders
  var cleanUpStorageFolders = function(onComplete) {
    rimraf(node1opts.storage, function() {
      rimraf(node2opts.storage, function() {
        rimraf(node3opts.storage, function() {
          onComplete();
        });
      });
    });
  };
  // launch node 1
  var node1 = KadServer(node1opts);
  node1.on('ready', function () {
    t.fail('Ready event should not be fired since there are no seeds specified.');
  });
  node1.on('no peers', function() {
    t.pass('Bootstrap server running');
    // launch node 2
    var node2 = KadServer(node2opts);
    node2.on('no peers', function() {
      t.fail('Node 2 could not connect to peer ' + JSON.stringify(node2opts.seeds));
    });
    node2.on('ready', function() {
      t.pass('Node 2 is connected to peer ' + JSON.stringify(node2opts.seeds));
      // launch node 3
      var node3 = KadServer(node3opts);
      node3.on('no peers', function() {
        t.fail('Node 3 could not connect to peers ' + JSON.stringify(node3opts.seeds));
      });
      node3.on('ready', function() {
        t.pass('Node 3 is connected to peers ' + JSON.stringify(node3opts.seeds));
        //testWriteRead(node1, key, value, function() {
          testWriteRead(node2, key, value, function() {
            testWriteRead(node3, key, value, function() {
              cleanUpStorageFolders(function() {
                t.end();
              });
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

test('test TTL ', function (t) {
  t.pass();
  t.end();
});

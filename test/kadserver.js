var rimraf = require('rimraf');
var test = require('tape');
var KadServer = require('../src/kadserver');

test('launch localhost bootstrap server', function (t) {
  var opts = {
    address: '127.0.0.1',
    port: 65535,
    seeds: [],
    storage: './test-db'
  };
  var server = KadServer(opts);
  server.on('ready', function () {
    t.fail('Ready event should not be fired since there are no seeds specified.');
  });
  server.on('no peers', function() {
    t.ok(true);
    // rm -rf ./test-db
    rimraf(opts.storage, function() {
      t.end();
    });
  });
  server.activate();
});

test('launch local overlay network', function (t) {
  // bootstrap node
  var bootOpts = {
    address: '127.0.0.1',
    port: 65535,
    seeds: [],
    storage: './test-db-1'
  };
  // peer 1
  var peer1Opts = {
    address: '127.0.0.1',
    port: 65534,
    seeds: [
      {
        address: '127.0.0.1',
        port: 65535
      }
    ],
    storage: './test-db-2'
  };
  // peer 2
  var peer2Opts = {
    address: '127.0.0.1',
    port: 65533,
    seeds: [
      {
        address: '127.0.0.1',
        port: 65535
      },
      {
        address: '127.0.0.1',
        port: 65534
      }
    ],
    storage: './test-db-3'
  };
  // launch boot node
  var bootServer = KadServer(bootOpts);
  bootServer.on('ready', function () {
    t.fail('Ready event should not be fired since there are no seeds specified.');
  });
  bootServer.on('no peers', function() {
    // launch peer 1
    var peer1 = KadServer(peer1Opts);
    peer1.on('no peers', function() {
      t.fail('Node 1 could not connect to peers ' + peer1Opts.seeds);
    });
    peer1.on('ready', function() {
      t.ok(true);
      // launch peer 2
      var peer2 = KadServer(peer2Opts);
      peer2.on('no peers', function() {
        t.fail('Node 2 could not connect to peers ' + peer2Opts.seeds);
      });
      peer2.on('ready', function() {
        t.ok(true);
        t.end();
      });
      peer2.activate();
    });
    peer1.activate();
  });
  bootServer.activate();
});

test('launch NATed bootstrap server', function (t) {

});

test('launch NATed overlay network', function (t) {

});

test('test basic write operation', function (t) {

});

test('test basic read operation', function (t) {

});

test('test ttl expiration', function (t) {

});

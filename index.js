var config = require('config');
var KadServer = require('./src/kadserver');

var server = KadServer(config);
  server.on('ready', function () {
    console.log('ready');
    // server.put('ping', 'pong', 3600)
    // .then(function() {
    //   console.log('ping');
    //   return server.get('ping');
    // })
    // .then(function(value) {
    //   console.log(value);
    // })
    // .catch(function (error) {
    //   console.error(error);
    // });
});
server.on('no peers', function() {
  console.log('no peers');
})
server.activate();

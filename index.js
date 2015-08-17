var config = require('config');
var KadServer = require('./src/kadserver');

var server = KadServer(config);
// server.on('ready', function () {
//   server.put('ping', 'pong', 3600)
//   .then(function() {
//     console.log('done');
//   })
//   .catch(function (error) {
//     console.error(error);
//   });
// });
server.on('no peers', function() {
  console.log('no peers');
})
server.activate();

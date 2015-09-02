module.exports = FakeStorage;

var EventEmitter = require('events').EventEmitter;

function FakeStorage(id) {
  this.data = {};
  this.id = id;
  console.log('Creating fakestorage ' + this.id);
}

FakeStorage.prototype.get = function(key, cb) {
  console.log('[fakestorage ' + this.id + '] get [' + key + ']');
  if (!this.data[key]) return cb(new Error('not found'));
  cb(null, this.data[key]);
};

FakeStorage.prototype.put = function(key, val, cb) {
  console.log('[fakestorage ' + this.id + '] put [' + key + ', ' + val +']');
  this.data[key] = val;
  cb(null, this.data[key]);
};

FakeStorage.prototype.del = function(key, cb) {
  console.log('[fakestorage ' + this.id + '] del [' + key + ']');
  delete this.data[key];
  cb(null);
};

FakeStorage.prototype.createReadStream = function() {
  return new EventEmitter();
};

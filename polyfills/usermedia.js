(function() {
  return (function(_module, _enumerateDevices, _getUserMedia) {
    (_module[_enumerateDevices] = function() {
      if (!_module.navigator.mediaDevices || !_module.navigator.mediaDevices.enumerateDevices) {
        return new Promise(function(resolve, reject) {
          reject(new Error('mediaDevices not available.'));
        });
      }
      return _module.navigator.mediaDevices.enumerateDevices();
    }),
      (_module[_getUserMedia] = function(options) {
        if (_module.navigator.mediaDevices === undefined) {
          _module.navigator.mediaDevices = {};
        }

        // Some browsers partially implement mediaDevices. We can't just assign an object
        // with getUserMedia as it would overwrite existing properties.
        // Here, we will just add the getUserMedia property if it's missing.
        if (_module.navigator.mediaDevices.getUserMedia === undefined) {
          _module.navigator.mediaDevices.getUserMedia = function(constraints) {
            // First get ahold of the legacy getUserMedia, if present
            var getUserMedia =
              _module.navigator.getUserMedia ||
              _module.navigator.mozGetUserMedia ||
              _module.navigator.webkitGetUserMedia ||
              _module.navigator.msGetUserMedia;

            // Some browsers just don't implement it - return a rejected promise with an error
            // to keep a consistent interface
            if (!getUserMedia) {
              return new Promise(function(resolve, reject) {
                reject(new Error('WebRTC not available.'));
              });
            }

            // Otherwise, wrap the call to the old navigator.getUserMedia with a Promise
            return new Promise(function(resolve, reject) {
              getUserMedia.call(_module.navigator, constraints, resolve, reject);
            });
          };
        }

        return _module.navigator.mediaDevices.getUserMedia(options);
      });
  })(window, 'enumerateDevices', 'getUserMedia');
})();

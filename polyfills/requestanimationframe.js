(function() {
  return (function(_module, _requestAnimationFrame, _cancelAnimationFrame) {
    var lastTime = new Date().getTime(),
      startTime = lastTime,
      vendors = ['ms', 'moz', 'webkit', 'o'];
    _module[_requestAnimationFrame] = _module.requestAnimationFrame;
    _module[_cancelAnimationFrame] = _module.cancelAnimationFrame;
    for (var x = 0; x < vendors.length && !_module[_requestAnimationFrame]; ++x) {
      _module[_requestAnimationFrame] = _module[vendors[x] + 'RequestAnimationFrame'];
      _module[_cancelAnimationFrame] =
        _module[vendors[x] + 'CancelAnimationFrame'] ||
        _module[vendors[x] + 'CancelRequestAnimationFrame'];
    }
    if (!_module[_requestAnimationFrame]) {
      _module[_requestAnimationFrame] = function(callback, element) {
        var currTime = new Date().getTime();
        var timeToCall = Math.max(0, 16 - (currTime - lastTime));
        var elapsed = currTime - startTime;
        var id = _module.setTimeout(function() {
          callback(elapsed + timeToCall);
        }, timeToCall);
        lastTime = currTime + timeToCall;
        return id;
      };
    }
    if (!_module[_cancelAnimationFrame]) {
      _module[_cancelAnimationFrame] = function(id) {
        clearTimeout(id);
      };
    }
  })(window, 'requestAnimationFrame', 'cancelAnimationFrame');
})();

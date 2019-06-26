/*
 * MIT License
 *  You may use this code as long as you retain this notice.  Use at your own risk! :)
 *  https://github.com/danschumann/limby-resize
 *  0.0.8
 */
(function() {
  return (function(_module, namespace) {
    _module[namespace] = function(original, canvas, callback) {
      var w1 = original.width,
        h1 = original.height,
        w2 = canvas.width,
        h2 = canvas.height,
        img = original.getContext('2d').getImageData(0, 0, w1, h1),
        img2 = canvas.getContext('2d').getImageData(0, 0, w2, h2);

      if (w2 > w1 || h2 > h1) {
        canvas.getContext('2d').drawImage(original, 0, 0, w2, h2);
        return callback();
      }

      var data = img.data;
      // it's an _ because we don't use it much, as working with doubles isn't great
      var _data2 = img2.data;
      // Instead, we enforce float type for every entity in the array
      // this prevents weird faded lines when things get rounded off
      var data2 = Array(_data2.length);
      for (var i = 0; i < _data2.length; i++) {
        data2[i] = 0.0;
      }

      // We track alphas, since we need to use alphas to correct colors later on
      var alphas = Array(_data2.length >> 2);
      for (var i = 0; i < _data2.length >> 2; i++) {
        alphas[i] = 1;
      }

      // this will always be between 0 and 1
      var xScale = w2 / w1;
      var yScale = h2 / h1;

      // We process 1 row at a time ( and then let the process rest for 0ms [async] )
      var nextY = function(y1) {
        for (var x1 = 0; x1 < w1; x1++) {
          var // the original pixel is split between two pixels in the output, we do an extra step
            extraX = false,
            extraY = false,
            // the output pixel
            targetX = Math.floor(x1 * xScale),
            targetY = Math.floor(y1 * yScale),
            // The percentage of this pixel going to the output pixel (this gets modified)
            xFactor = xScale,
            yFactor = yScale,
            // The percentage of this pixel going to the right neighbor or bottom neighbor
            bottomFactor = 0,
            rightFactor = 0,
            // positions of pixels in the array
            offset = (y1 * w1 + x1) * 4,
            alphaOffset = 0,
            targetOffset = (targetY * w2 + targetX) * 4;

          // Right side goes into another pixel
          if (targetX < Math.floor((x1 + 1) * xScale)) {
            rightFactor = ((x1 + 1) * xScale) % 1;
            xFactor -= rightFactor;

            extraX = true;
          }

          // Bottom side goes into another pixel
          if (targetY < Math.floor((y1 + 1) * yScale)) {
            bottomFactor = ((y1 + 1) * yScale) % 1;
            yFactor -= bottomFactor;

            extraY = true;
          }

          var a;

          a = data[offset + 3] / 255;

          alphaOffset = targetOffset / 4;

          if (extraX) {
            // Since we're not adding the color of invisible pixels,  we multiply by a
            data2[targetOffset + 4] += data[offset] * rightFactor * yFactor * a;
            data2[targetOffset + 5] += data[offset + 1] * rightFactor * yFactor * a;
            data2[targetOffset + 6] += data[offset + 2] * rightFactor * yFactor * a;

            data2[targetOffset + 7] += data[offset + 3] * rightFactor * yFactor;

            // if we left out the color of invisible pixels(fully or partly)
            // the entire average we end up with will no longer be out of 255
            // so we subtract the percentage from the alpha ( originally 1 )
            // so that we can reverse this effect by dividing by the amount.
            // ( if one pixel is black and invisible, and the other is white and visible,
            // the white pixel will weight itself at 50% because it does not know the other pixel is invisible
            // so the total(color) for the new pixel would be 128(gray), but it should be all white.
            // the alpha will be the correct 128, combinging alphas, but we need to preserve the color
            // of the visible pixels )
            alphas[alphaOffset + 1] -= (1 - a) * rightFactor * yFactor;
          }

          if (extraY) {
            data2[targetOffset + w2 * 4] += data[offset] * xFactor * bottomFactor * a;
            data2[targetOffset + w2 * 4 + 1] += data[offset + 1] * xFactor * bottomFactor * a;
            data2[targetOffset + w2 * 4 + 2] += data[offset + 2] * xFactor * bottomFactor * a;

            data2[targetOffset + w2 * 4 + 3] += data[offset + 3] * xFactor * bottomFactor;

            alphas[alphaOffset + w2] -= (1 - a) * xFactor * bottomFactor;
          }

          if (extraX && extraY) {
            data2[targetOffset + w2 * 4 + 4] += data[offset] * rightFactor * bottomFactor * a;
            data2[targetOffset + w2 * 4 + 5] += data[offset + 1] * rightFactor * bottomFactor * a;
            data2[targetOffset + w2 * 4 + 6] += data[offset + 2] * rightFactor * bottomFactor * a;

            data2[targetOffset + w2 * 4 + 7] += data[offset + 3] * rightFactor * bottomFactor;

            alphas[alphaOffset + w2 + 1] -= (1 - a) * rightFactor * bottomFactor;
          }

          data2[targetOffset] += data[offset] * xFactor * yFactor * a;
          data2[targetOffset + 1] += data[offset + 1] * xFactor * yFactor * a;
          data2[targetOffset + 2] += data[offset + 2] * xFactor * yFactor * a;

          data2[targetOffset + 3] += data[offset + 3] * xFactor * yFactor;

          alphas[alphaOffset] -= (1 - a) * xFactor * yFactor;
        }

        if (y1++ < h1) {
          // Big images shouldn't block for a long time.
          // This breaks up the process and allows other processes to tick
          setTimeout(function() {
            nextY(y1);
          }, 0);
        } else done();
      };

      var done = function() {
        // fully distribute the color of pixels that are partially full because their neighbor is transparent
        // (i.e. undo the invisible pixels are averaged with visible ones)
        for (var i = 0; i < _data2.length >> 2; i++) {
          if (alphas[i] && alphas[i] < 1) {
            data2[i << 2] /= alphas[i]; // r
            data2[(i << 2) + 1] /= alphas[i]; // g
            data2[(i << 2) + 2] /= alphas[i]; // b
          }
        }

        // re populate the actual imgData
        for (var i = 0; i < data2.length; i++) {
          _data2[i] = Math.round(data2[i]);
        }

        var context = canvas.getContext('2d');
        context.putImageData(img2, 0, 0);
        callback();
      };

      // Start processing the image at row 0
      nextY(0);
    };
  })(window, 'canvasResize');
})();

var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

function createCommonjsModule(fn, module) {
	return module = { exports: {} }, fn(module, module.exports), module.exports;
}

var FileSaver_min = createCommonjsModule(function (module, exports) {
(function(a,b){b();})(commonjsGlobal,function(){function b(a,b){return "undefined"==typeof b?b={autoBom:!1}:"object"!=typeof b&&(console.warn("Deprecated: Expected third argument to be a object"),b={autoBom:!b}),b.autoBom&&/^\s*(?:text\/\S*|application\/xml|\S*\/\S*\+xml)\s*;.*charset\s*=\s*utf-8/i.test(a.type)?new Blob(["\uFEFF",a],{type:a.type}):a}function c(b,c,d){var e=new XMLHttpRequest;e.open("GET",b),e.responseType="blob",e.onload=function(){a(e.response,c,d);},e.onerror=function(){console.error("could not download file");},e.send();}function d(a){var b=new XMLHttpRequest;b.open("HEAD",a,!1);try{b.send();}catch(a){}return 200<=b.status&&299>=b.status}function e(a){try{a.dispatchEvent(new MouseEvent("click"));}catch(c){var b=document.createEvent("MouseEvents");b.initMouseEvent("click",!0,!0,window,0,0,0,80,20,!1,!1,!1,!1,0,null),a.dispatchEvent(b);}}var f="object"==typeof window&&window.window===window?window:"object"==typeof self&&self.self===self?self:"object"==typeof commonjsGlobal&&commonjsGlobal.global===commonjsGlobal?commonjsGlobal:void 0,a=f.saveAs||("object"!=typeof window||window!==f?function(){}:"download"in HTMLAnchorElement.prototype?function(b,g,h){var i=f.URL||f.webkitURL,j=document.createElement("a");g=g||b.name||"download",j.download=g,j.rel="noopener","string"==typeof b?(j.href=b,j.origin===location.origin?e(j):d(j.href)?c(b,g,h):e(j,j.target="_blank")):(j.href=i.createObjectURL(b),setTimeout(function(){i.revokeObjectURL(j.href);},4E4),setTimeout(function(){e(j);},0));}:"msSaveOrOpenBlob"in navigator?function(f,g,h){if(g=g||f.name||"download","string"!=typeof f)navigator.msSaveOrOpenBlob(b(f,h),g);else if(d(f))c(f,g,h);else{var i=document.createElement("a");i.href=f,i.target="_blank",setTimeout(function(){e(i);});}}:function(a,b,d,e){if(e=e||open("","_blank"),e&&(e.document.title=e.document.body.innerText="downloading..."),"string"==typeof a)return c(a,b,d);var g="application/octet-stream"===a.type,h=/constructor/i.test(f.HTMLElement)||f.safari,i=/CriOS\/[\d]+/.test(navigator.userAgent);if((i||g&&h)&&"object"==typeof FileReader){var j=new FileReader;j.onloadend=function(){var a=j.result;a=i?a:a.replace(/^data:[^;]*;/,"data:attachment/file;"),e?e.location.href=a:location=a,e=null;},j.readAsDataURL(a);}else{var k=f.URL||f.webkitURL,l=k.createObjectURL(a);e?e.location=l:location.href=l,e=null,setTimeout(function(){k.revokeObjectURL(l);},4E4);}});f.saveAs=a.saveAs=a,module.exports=a;});


});

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

var stackBoxBlurMult = [
    1,
    171,
    205,
    293,
    57,
    373,
    79,
    137,
    241,
    27,
    391,
    357,
    41,
    19,
    283,
    265
];
var stackBoxBlurShift = [
    0,
    9,
    10,
    11,
    9,
    12,
    10,
    11,
    12,
    9,
    13,
    13,
    10,
    9,
    13,
    13
];
var neighborhood = [
    [1, 0],
    [1, -1],
    [0, -1],
    [-1, -1],
    [-1, 0],
    [-1, 1],
    [0, 1],
    [1, 1]
];

/*
Copyright (c) 2011 Juan Mellado
Updated by `Racheh Wahid` (2019)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the 'Software'), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.

References:
- 'OpenCV: Open Computer Vision Library'
  http://sourceforge.net/projects/opencvlibrary/
- 'Stack Blur: Fast But Goodlooking'
  http://incubator.quasimondo.com/processing/fast_blur_deluxe.php
*/
var blurStack = function () {
    return {
        color: 0,
        next: null
    };
};
var getImage = function (image) {
    return image
        ? {
            width: image.width || 0,
            height: image.height || 0,
            data: image.data || []
        }
        : {
            width: 0,
            height: 0,
            data: []
        };
};
var grayscale = function (imageSrc, imageDst) {
    var src = imageSrc.data, dst = imageDst.data;
    var len = src.length | 0, srcLength_16 = (len - 16) | 0;
    var i = 0, j = 0;
    var coeff_r = 0.6, coeff_g = 0.9, coeff_b = 0.2;
    //let coeff_r: number = 0.299, coeff_g: number = 0.587, coeff_b: number = 0.114;
    //let coeff_r: number = 4899, coeff_g: number = 9617, coeff_b: number = 1868;
    for (i = 0; i <= srcLength_16; i += 16, j += 4) {
        dst[j] = (src[i] * coeff_r + src[i + 1] * coeff_g + src[i + 2] * coeff_b + 8192) & 0xff;
        dst[j + 1] = (src[i + 4] * coeff_r + src[i + 5] * coeff_g + src[i + 6] * coeff_b + 8192) & 0xff;
        dst[j + 2] =
            (src[i + 8] * coeff_r + src[i + 9] * coeff_g + src[i + 10] * coeff_b + 8192) & 0xff;
        dst[j + 3] =
            (src[i + 12] * coeff_r + src[i + 13] * coeff_g + src[i + 14] * coeff_b + 8192) & 0xff;
    }
    for (i = 0; i < len; i += 4) {
        dst[j++] = (src[i] * coeff_r + src[i + 1] * coeff_g + src[i + 2] * coeff_b + 0.5) & 0xff;
    }
    imageDst.width = imageSrc.width;
    imageDst.height = imageSrc.height;
    return imageDst;
};
var stackBoxBlur = function (imageSrc, imageDst, kernelSize) {
    var src = imageSrc.data, dst = imageDst.data, height = imageSrc.height, width = imageSrc.width, heightMinus1 = height - 1, widthMinus1 = width - 1, size = kernelSize + kernelSize + 1, radius = kernelSize + 1, mult = stackBoxBlurMult[kernelSize], shift = stackBoxBlurShift[kernelSize], stack, stackStart, color, sum, pos, start, p, x, y, i;
    stack = stackStart = blurStack();
    for (i = 1; i < size; ++i) {
        stack = stack.next = blurStack();
    }
    stack.next = stackStart;
    pos = 0;
    for (y = 0; y < height; ++y) {
        start = pos;
        color = src[pos];
        sum = radius * color;
        stack = stackStart;
        for (i = 0; i < radius; ++i) {
            stack.color = color;
            stack = stack.next;
        }
        for (i = 1; i < radius; ++i) {
            stack.color = src[pos + i];
            sum += stack.color;
            stack = stack.next;
        }
        stack = stackStart;
        for (x = 0; x < width; ++x) {
            dst[pos++] = (sum * mult) >>> shift;
            p = x + radius;
            p = start + (p < widthMinus1 ? p : widthMinus1);
            sum -= stack.color - src[p];
            stack.color = src[p];
            stack = stack.next;
        }
    }
    for (x = 0; x < width; ++x) {
        pos = x;
        start = pos + width;
        color = dst[pos];
        sum = radius * color;
        stack = stackStart;
        for (i = 0; i < radius; ++i) {
            stack.color = color;
            stack = stack.next;
        }
        for (i = 1; i < radius; ++i) {
            stack.color = dst[start];
            sum += stack.color;
            stack = stack.next;
            start += width;
        }
        stack = stackStart;
        for (y = 0; y < height; ++y) {
            dst[pos] = (sum * mult) >>> shift;
            p = y + radius;
            p = x + (p < heightMinus1 ? p : heightMinus1) * width;
            sum -= stack.color - dst[p];
            stack.color = dst[p];
            stack = stack.next;
            pos += width;
        }
    }
    return imageDst;
};
var adaptiveThreshold = function (imageSrc, imageDst, kernelSize, threshold) {
    var src = imageSrc.data, dst = imageDst.data, len = src.length, tab = [], i;
    stackBoxBlur(imageSrc, imageDst, kernelSize);
    for (i = 0; i < 768; ++i) {
        tab[i] = i - 255 <= -threshold ? 255 : 0;
    }
    for (i = 0; i < len; ++i) {
        dst[i] = tab[src[i] - dst[i] + 255];
    }
    imageDst.width = imageSrc.width;
    imageDst.height = imageSrc.height;
    return imageDst;
};
var binaryBorder = function (imageSrc, dst) {
    var src = imageSrc.data, height = imageSrc.height, width = imageSrc.width, posSrc = 0, posDst = 0, i, j;
    for (j = -2; j < width; ++j) {
        dst[posDst++] = 0;
    }
    for (i = 0; i < height; ++i) {
        dst[posDst++] = 0;
        for (j = 0; j < width; ++j) {
            dst[posDst++] = 0 === src[posSrc++] ? 0 : 1;
        }
        dst[posDst++] = 0;
    }
    for (j = -2; j < width; ++j) {
        dst[posDst++] = 0;
    }
    return dst;
};
var neighborhoodDeltas = function (width) {
    var deltas = [], len = neighborhood.length, i = 0;
    for (; i < len; ++i) {
        deltas[i] = neighborhood[i][0] + neighborhood[i][1] * width;
    }
    return deltas.concat(deltas);
};
var borderFollowing = function (src, pos, nbd, point, hole, deltas) {
    var contour = [], pos1, pos3, pos4, s, s_end;
    //contour.hole = hole;
    s = s_end = hole ? 0 : 4;
    do {
        s = (s - 1) & 7;
        pos1 = pos + deltas[s];
        if (src[pos1] !== 0) {
            break;
        }
    } while (s !== s_end);
    if (s === s_end) {
        src[pos] = -nbd;
        contour.push({ x: point.x, y: point.y });
    }
    else {
        pos3 = pos;
        while (true) {
            s_end = s;
            do {
                pos4 = pos3 + deltas[++s];
            } while (src[pos4] === 0);
            s &= 7;
            if ((s - 1) >>> 0 < s_end >>> 0) {
                src[pos3] = -nbd;
            }
            else if (src[pos3] === 1) {
                src[pos3] = nbd;
            }
            contour.push({ x: point.x, y: point.y });
            point.x += neighborhood[s][0];
            point.y += neighborhood[s][1];
            if (pos4 === pos && pos3 === pos1) {
                break;
            }
            pos3 = pos4;
            s = (s + 4) & 7;
        }
    }
    return contour;
};
var findContours = function (imageSrc, binary) {
    var width = imageSrc.width, height = imageSrc.height, contours = [], src, deltas, pos, pix, nbd, outer, hole, i, j;
    src = binaryBorder(imageSrc, binary);
    deltas = neighborhoodDeltas(width + 2);
    pos = width + 3;
    nbd = 1;
    for (i = 0; i < height; ++i, pos += 2) {
        for (j = 0; j < width; ++j, ++pos) {
            pix = src[pos];
            if (0 !== pix) {
                outer = hole = false;
                if (1 === pix && 0 === src[pos - 1]) {
                    outer = true;
                }
                else if (pix >= 1 && 0 === src[pos + 1]) {
                    hole = true;
                }
                if (outer || hole) {
                    ++nbd;
                    contours.push(borderFollowing(src, pos, nbd, { x: j, y: i }, hole, deltas));
                }
            }
        }
    }
    return contours;
};
var approxPolyDP = function (contour, epsilon) {
    var slice = { start_index: 0, end_index: 0 }, right_slice = { start_index: 0, end_index: 0 }, poly = [], stack = [], len = contour.length, pt, start_pt = { x: 0, y: 0 }, end_pt = { x: 0, y: 0 }, dist, max_dist = 0, le_eps, dx, dy, i, j, k;
    epsilon *= epsilon;
    k = 0;
    for (i = 0; i < 3; ++i) {
        max_dist = 0;
        k = (k + right_slice.start_index) % len;
        start_pt = contour[k];
        if (++k === len) {
            k = 0;
        }
        for (j = 1; j < len; ++j) {
            pt = contour[k];
            if (++k === len) {
                k = 0;
            }
            dx = pt.x - start_pt.x;
            dy = pt.y - start_pt.y;
            dist = dx * dx + dy * dy;
            if (dist > max_dist) {
                max_dist = dist;
                right_slice.start_index = j;
            }
        }
    }
    if (max_dist <= epsilon) {
        poly.push({ x: start_pt.x, y: start_pt.y });
    }
    else {
        slice.start_index = k;
        slice.end_index = right_slice.start_index += slice.start_index;
        right_slice.start_index -= right_slice.start_index >= len ? len : 0;
        right_slice.end_index = slice.start_index;
        if (right_slice.end_index < right_slice.start_index) {
            right_slice.end_index += len;
        }
        stack.push({
            start_index: right_slice.start_index,
            end_index: right_slice.end_index
        });
        stack.push({
            start_index: slice.start_index,
            end_index: slice.end_index
        });
    }
    while (stack.length !== 0) {
        slice = stack.pop();
        end_pt = contour[slice.end_index % len];
        start_pt = contour[(k = slice.start_index % len)];
        if (++k === len) {
            k = 0;
        }
        if (slice.end_index <= slice.start_index + 1) {
            le_eps = true;
        }
        else {
            max_dist = 0;
            dx = end_pt.x - start_pt.x;
            dy = end_pt.y - start_pt.y;
            for (i = slice.start_index + 1; i < slice.end_index; ++i) {
                pt = contour[k];
                if (++k === len) {
                    k = 0;
                }
                dist = Math.abs((pt.y - start_pt.y) * dx - (pt.x - start_pt.x) * dy);
                if (dist > max_dist) {
                    max_dist = dist;
                    right_slice.start_index = i;
                }
            }
            le_eps = max_dist * max_dist <= epsilon * (dx * dx + dy * dy);
        }
        if (le_eps) {
            poly.push({ x: start_pt.x, y: start_pt.y });
        }
        else {
            right_slice.end_index = slice.end_index;
            slice.end_index = right_slice.start_index;
            stack.push({
                start_index: right_slice.start_index,
                end_index: right_slice.end_index
            });
            stack.push({
                start_index: slice.start_index,
                end_index: slice.end_index
            });
        }
    }
    return poly;
};
var isContourConvex = function (contour) {
    var orientation = 0, convex = true, len = contour.length, i = 0, j = 0, cur_pt, prev_pt, dxdy0, dydx0, dx0, dy0, dx, dy;
    prev_pt = contour[len - 1];
    cur_pt = contour[0];
    dx0 = cur_pt.x - prev_pt.x;
    dy0 = cur_pt.y - prev_pt.y;
    for (; i < len; ++i) {
        if (++j === len) {
            j = 0;
        }
        prev_pt = cur_pt;
        cur_pt = contour[j];
        dx = cur_pt.x - prev_pt.x;
        dy = cur_pt.y - prev_pt.y;
        dxdy0 = dx * dy0;
        dydx0 = dy * dx0;
        orientation |= dydx0 > dxdy0 ? 1 : dydx0 < dxdy0 ? 2 : 3;
        if (3 === orientation) {
            convex = false;
            break;
        }
        dx0 = dx;
        dy0 = dy;
    }
    return convex;
};
var getRectSize = function (x, y, tl, tr, bl, br) {
    // Calculate the max width/height
    var wb = Math.hypot(br.x - bl.x, br.y - bl.y);
    var wt = Math.hypot(tr.x - tl.x, tr.y - tl.y);
    var w = wb > wt ? wb : wt;
    var hr = Math.hypot(tr.x - br.x, tr.y - br.y);
    var hl = Math.hypot(tl.x - bl.x, tr.y - bl.y);
    var h = hr > hl ? hr : hl;
    return {
        width: w,
        height: h,
        x: x,
        y: y,
        tl: tl,
        tr: tr,
        bl: bl,
        br: br
    };
};
var findCornersPosition = function (contour) {
    var cornerArray = [contour[3], contour[0], contour[2], contour[1]];
    //Determine left/right based on x position of top and bottom 2
    var tl = cornerArray[0].x < cornerArray[1].x ? cornerArray[0] : cornerArray[1];
    var tr = cornerArray[0].x > cornerArray[1].x ? cornerArray[0] : cornerArray[1];
    var bl = cornerArray[2].x < cornerArray[3].x ? cornerArray[2] : cornerArray[3];
    var br = cornerArray[2].x > cornerArray[3].x ? cornerArray[2] : cornerArray[3];
    return getRectSize(cornerArray[0].x, cornerArray[0].y, tl, tr, bl, br);
};
var minEdgeLength = function (poly) {
    var len = poly.length, i = 0, j = len - 1, min = Infinity, d, dx, dy;
    for (; i < len; j = i++) {
        dx = poly[i].x - poly[j].x;
        dy = poly[i].y - poly[j].y;
        d = dx * dx + dy * dy;
        if (d < min) {
            min = d;
        }
    }
    return Math.sqrt(min);
};
var findCandidates = function (contours, minSize, epsilon, minLength, minLimit) {
    var candidates = [], len = contours.length, contour, poly, i;
    for (i = 0; i < len; ++i) {
        contour = contours[i];
        if (contour.length >= minSize) {
            poly = approxPolyDP(contour, contour.length * epsilon);
            if (poly.length === 4 && isContourConvex(poly)) {
                poly.point = findCornersPosition(poly);
                var min = minEdgeLength(poly);
                poly.hasValidEdgeLength = min >= minLimit;
                if (min >= minLength) {
                    candidates.push(poly);
                }
            }
        }
    }
    return candidates;
};
var detectContour = function (image, ceil) {
    var grey = getImage();
    var thres = getImage();
    var binary = [];
    grayscale(image, grey);
    adaptiveThreshold(grey, thres, 2, 1);
    var contours = findContours(thres, binary);
    var size = image.width < image.height ? image.width : image.height;
    var candidates = findCandidates(contours, image.width * 0.2, 0.05, 100, size - (ceil * 2 + 20));
    return candidates;
};
var isValidPoint = function (p1, p2, ceil) {
    var isValidTlx = p1.tl.x >= p2.tl.x - ceil;
    var isValidTly = p1.tl.y >= p2.tl.y - ceil;
    var isValidTrx = p1.tr.x <= p2.tr.x + ceil;
    var isValidTry = p1.tr.y >= p2.tr.y - ceil;
    var isValidBlx = p1.bl.x >= p2.bl.x - ceil;
    var isValidBly = p1.bl.y <= p2.bl.y + ceil;
    var isValidBrx = p1.br.x <= p2.br.x + ceil;
    var isValidBry = p1.br.y <= p2.br.y + ceil;
    var isValidTx = p1.tl.x <= p2.tl.x + ceil;
    var isValidBx = p1.br.x >= p2.br.x - ceil;
    var isValidTy = p1.tl.y <= p2.tl.y + ceil;
    var isValidBy = p1.br.y >= p2.br.y - ceil;
    return (isValidTlx &&
        isValidTly &&
        isValidTrx &&
        isValidTry &&
        isValidBlx &&
        isValidBly &&
        isValidBrx &&
        isValidBry &&
        ((isValidTx && isValidBx) || (isValidTy && isValidBy)));
};
var getRectCoordinates = function (x, y, width, height, radius) {
    if (typeof radius === 'undefined') {
        radius = 1;
    }
    if (typeof radius === 'number') {
        radius = { tl: radius, tr: radius, br: radius, bl: radius };
    }
    else {
        var defaultRadius = { tl: 0, tr: 0, br: 0, bl: 0 };
        var keys = Object.keys(defaultRadius);
        for (var i = 0; i < keys.length; i++) {
            var side = keys[i];
            radius[side] = radius[side] || defaultRadius[side];
        }
    }
    return {
        tr: {
            x: x + width - radius.tr,
            y: y,
            qct: { cpx: x + width, cpy: y, x: x + width, y: y + radius.tr }
        },
        br: {
            x: x + width,
            y: y + height - radius.br,
            qct: {
                cpx: x + width,
                cpy: y + height,
                x: x + width - radius.br,
                y: y + height
            }
        },
        bl: {
            x: x + radius.bl,
            y: y + height,
            qct: { cpx: x, cpy: y + height, x: x, y: y + height - radius.bl }
        },
        tl: {
            x: x,
            y: y + radius.tl,
            qct: { cpx: x, cpy: y, x: x + radius.tl, y: y }
        },
        x: x,
        y: y,
        radius: radius
    };
};
// Draw rectangle : draw 4 lines
var drawRect = function (ctx, x, y, width, height, lineWidth, color, radius, fill, stroke) {
    if (typeof stroke === 'undefined') {
        stroke = true;
    }
    var rectCoordinate = getRectCoordinates(x, y, width, height, radius);
    // Draw lines
    ctx.beginPath();
    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = color;
    ctx.moveTo(rectCoordinate.x + rectCoordinate.radius.tl, rectCoordinate.y);
    ctx.lineTo(rectCoordinate.tr.x, rectCoordinate.tr.y);
    if (rectCoordinate.tr.qct) {
        ctx.quadraticCurveTo(rectCoordinate.tr.qct.cpx, rectCoordinate.tr.qct.cpy, rectCoordinate.tr.qct.x, rectCoordinate.tr.qct.y);
    }
    ctx.lineTo(rectCoordinate.br.x, rectCoordinate.br.y);
    if (rectCoordinate.br.qct) {
        ctx.quadraticCurveTo(rectCoordinate.br.qct.cpx, rectCoordinate.br.qct.cpy, rectCoordinate.br.qct.x, rectCoordinate.br.qct.y);
    }
    ctx.lineTo(rectCoordinate.bl.x, rectCoordinate.bl.y);
    if (rectCoordinate.bl.qct) {
        ctx.quadraticCurveTo(rectCoordinate.bl.qct.cpx, rectCoordinate.bl.qct.cpy, rectCoordinate.bl.qct.x, rectCoordinate.bl.qct.y);
    }
    ctx.lineTo(rectCoordinate.tl.x, rectCoordinate.tl.y);
    if (rectCoordinate.tl.qct) {
        ctx.quadraticCurveTo(rectCoordinate.tl.qct.cpx, rectCoordinate.tl.qct.cpy, rectCoordinate.tl.qct.x, rectCoordinate.tl.qct.y);
    }
    ctx.closePath();
    if (fill) {
        ctx.fill();
    }
    if (stroke) {
        ctx.stroke();
    }
};
// Get outside rectangles area coordinates
var getOutsideRectCoordinates = function (ceil, contextWidth, rectTopLeftX, rectTopLeftY, rectTopRightX, rectTopRightY, rectBottomLeftY, rectWidth, rectHeight) {
    var rectRadius = {
        top: { x: 0, y: 0, width: 0, height: 0 },
        left: { x: 0, y: 0, width: 0, height: 0 },
        right: { x: 0, y: 0, width: 0, height: 0 },
        bottom: { x: 0, y: 0, width: 0, height: 0 }
    };
    // Top area
    rectRadius.top.width = contextWidth;
    rectRadius.top.height = rectTopLeftY - 1;
    // Bottom area
    rectRadius.bottom.y = rectBottomLeftY;
    rectRadius.bottom.width = contextWidth;
    rectRadius.bottom.height = rectBottomLeftY - 0.1;
    // Left area
    rectRadius.left.y = rectTopLeftY - 1;
    rectRadius.left.width = rectTopLeftX;
    rectRadius.left.height = rectHeight;
    // Right area
    rectRadius.right.x = rectTopRightX;
    rectRadius.right.y = rectTopRightY;
    rectRadius.right.width = contextWidth - (rectTopLeftX + rectWidth);
    rectRadius.right.height = rectHeight;
    return rectRadius;
};
// Draw outside rectangles
var clipRect = function (ctx, coordinates, color) {
    ctx.beginPath();
    ctx.fillStyle = color;
    // Top area
    ctx.fillRect(coordinates.top.x, coordinates.top.y, coordinates.top.width, coordinates.top.height);
    // Bottom side
    ctx.fillRect(coordinates.bottom.x, coordinates.bottom.y, coordinates.bottom.width, coordinates.bottom.height);
    // Left area
    ctx.fillRect(coordinates.left.x, coordinates.left.y, coordinates.left.width, coordinates.left.height);
    // Right area
    ctx.fillRect(coordinates.right.x, coordinates.right.y, coordinates.right.width, coordinates.right.height);
    ctx.fill();
    ctx.closePath();
};
var getColor = function (imageData, x, y, width) {
    var index = (x + y * width) * 4;
    var r = imageData.data[index + 0];
    var g = imageData.data[index + 1];
    var b = imageData.data[index + 2];
    var a = imageData.data[index + 3];
    return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
};
var cropImage = function (ctx, x, y, w, h, scale) {
    // Original size
    /*
    let canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    let context = canvas.getContext('2d');
    context.rect(0, 0, w, h);
    context.fillStyle = 'white';
    context.fill();
    context.putImageData(ctx.getImageData(x, y, w, h), 0, 0);
    return canvas.toDataURL(fileExtension);
    */
    // With scale
    var i, j, it, jt;
    scale = scale || 1;
    var canvas = document.createElement('canvas');
    canvas.width = w * scale;
    canvas.height = h * scale;
    var context = canvas.getContext('2d');
    if (context) {
        var sourceData = ctx.getImageData(x, y, w, h);
        context.beginPath();
        for (i = 0; i < w; i++) {
            it = i * scale;
            for (j = 0; j < h; j++) {
                jt = j * scale;
                var color = getColor(sourceData, i, j, w);
                context.fillStyle = color;
                context.fillRect(it, jt, scale, scale);
            }
        }
    }
    return canvas;
};

// return a promise that resolves with a File instance
// Usage example:
// base64toFile('data:text/plain;base64,aGVsbG8gd29ybGQ=', 'hello.txt', 'text/plain').then(function(file){console.log(file);});
var base64toFile = function (url, filename, mimeType) {
    return fetch(url)
        .then(function (res) {
        return res.arrayBuffer();
    })
        .then(function (buf) {
        return new File([buf], filename, { type: mimeType });
    });
};
var getBlobFromImageData = function (image_data) {
    var blob;
    var parsedImageData = atob(image_data.split(',')[1]);
    // Use typed arrays to convert the binary data to a Blob
    var arraybuffer = new ArrayBuffer(parsedImageData.length);
    var view = new Uint8Array(arraybuffer);
    for (var i = 0; i < parsedImageData.length; i++) {
        view[i] = parsedImageData.charCodeAt(i) & 0xff;
    }
    try {
        // This is the recommended method:
        blob = new Blob([arraybuffer], {
            type: 'application/octet-stream'
        });
    }
    catch (e) {
        // The BlobBuilder API has been deprecated in favour of Blob, but older
        // browsers don't know about the Blob constructor
        // IE10 also supports BlobBuilder, but since the `Blob` constructor
        //  also works, there's no need to add `MSBlobBuilder`.
        var bb = new (window.WebKitBlobBuilder || window.MozBlobBuilder)();
        bb.append(arraybuffer);
        blob = bb.getBlob('application/octet-stream'); // <-- Here's the Blob
    }
    return blob;
};

var Detector = /** @class */ (function () {
    function Detector(options) {
        this.drawContour = false;
        this.isImageCaptured = false;
        this.ceil = options.ceil || 50;
        this.width = options.width || 400;
        this.height = options.height || 600;
        this.lineWidth = options.lineWidth || 5;
        this.dpi = options.dpi || 300;
        this.rectBorderDefaultColor = options.rectBorderDefaultColor || 'white';
        this.rectBorderColorSuccess = options.rectBorderColorSuccess || 'green';
        this.rectBorderColorError = options.rectBorderColorError || 'red';
        this.outsideBackgroundColor = options.outsideBackgroundColor || 'rgba(0, 0, 0, 0.3)';
        this.drawContour = options.drawContour || false;
        this.isImageCaptured = false;
        this.mimeType = options.mimeType || 'image/png';
        this.imageExtension = options.imageExtension || 'png';
        this.originalCanvas = null;
        this.cropContainer = null;
        this.outsideRectCoordinates = null;
        this.imageData = null;
        this.strokeColor = this.rectBorderDefaultColor;
        this.currentStream = undefined;
        this.videoInputList = [];
        this.raf = null;
        this.roundRectX = this.ceil;
        this.roundRectY = this.ceil;
        this.roundRectWidth = this.width - this.ceil * 2;
        this.roundRectHeight = this.height - this.ceil * 3;
        this.ratio = options.ratio || { w: 210, h: 297 }; // A4 by default
        this.formattedRatio = this.ratio;
    }
    Detector.prototype.initRectRatio = function (ratio, w, h, ceil) {
        var obj = {};
        var canvasRatio = w / h;
        var assign = function (mainProp, dependentProp, r, canvasProp) {
            if (w <= h) {
                obj[mainProp] = canvasProp - ceil * 2;
                obj[dependentProp] = obj[mainProp] * r;
            }
            else {
                obj[dependentProp] = canvasProp - ceil * 2;
                obj[mainProp] = obj[dependentProp] * r;
            }
        };
        if (w === h || canvasRatio > 1) {
            assign('h', 'w', 1 / ratio, h);
        }
        else if (canvasRatio < ratio) {
            assign('h', 'w', ratio, h);
        }
        else {
            assign('w', 'h', 1 / ratio, w);
        }
        obj.x = (w - obj.w) / 2;
        obj.y = (h - obj.h) / 2;
        return obj;
    };
    // Init rectangle coordinates
    Detector.prototype.initRectCoordinates = function () {
        this.formattedRatio.w = this.ratio.w;
        this.formattedRatio.h = this.ratio.h;
        if (this.width >= this.height) {
            this.formattedRatio.w = this.ratio.h;
            this.formattedRatio.h = this.ratio.w;
        }
        var ratio = this.formattedRatio.w / this.formattedRatio.h;
        var rectangle = this.initRectRatio(ratio, this.width, this.height, this.ceil);
        this.roundRectX = rectangle.x;
        this.roundRectY = rectangle.y;
        this.roundRectWidth = rectangle.w;
        this.roundRectHeight = rectangle.h;
        // Get centered rectangle coordinates
        this.cropContainer = getRectCoordinates(this.roundRectX, this.roundRectY, this.roundRectWidth, this.roundRectHeight);
        this.outsideRectCoordinates = getOutsideRectCoordinates(this.ceil, this.width, this.cropContainer.tl.x, this.cropContainer.tl.y, this.cropContainer.tr.x, this.cropContainer.tr.y, this.cropContainer.bl.y, this.roundRectWidth, this.roundRectHeight);
    };
    // Draw image data
    Detector.prototype.putImageData = function (context, video) {
        // Hack to center stream on mobile devices
        var dx = 0;
        var innerWidth = window.innerWidth;
        if (innerWidth < 450) {
            dx = video.width / 4;
        }
        // Draw video stream
        context.drawImage(video, -dx, 0, video.width, video.height);
        // Get image data
        this.imageData = context.getImageData(0, 0, video.width, video.height);
        // Clear rect
        context.clearRect(0, 0, this.width, this.height);
        // Render stream into canvas
        context.putImageData(this.imageData, 0, 0);
    };
    Detector.prototype.drawRectangle = function (context) {
        // Draw outside rectangle
        if (this.outsideRectCoordinates) {
            clipRect(context, this.outsideRectCoordinates, this.outsideBackgroundColor);
        }
        // Draw rectangle
        drawRect(context, this.roundRectX, this.roundRectY, this.roundRectWidth, this.roundRectHeight, this.lineWidth, this.strokeColor);
        // Update border color
        if (!this.isImageCaptured) {
            this.strokeColor = this.rectBorderDefaultColor;
        }
    };
    // Detect object
    Detector.prototype.detect = function (context, callback) {
        if (!this.imageData) {
            callback();
            return;
        }
        // Detect contours
        var candidates = detectContour(this.imageData, this.ceil);
        var self = this;
        // Find object
        self.findObject(context, candidates, 0, 0, function () {
            var timeout = window.setTimeout(function () {
                self.isImageCaptured = false;
                window.clearTimeout(timeout);
            }, 2000);
            callback();
        });
    };
    // Find object
    Detector.prototype.findObject = function (context, contours, x, y, callback) {
        var i = contours.length, contour;
        while (i--) {
            if (!this.isImageCaptured) {
                contour = contours[i];
                this.strokeColor = this.rectBorderColorError;
                if (contour && contour.length === 4 && this.cropContainer) {
                    contour.isValide = isValidPoint(contour.point, this.cropContainer, 5);
                    if (contour.point.width > 0 && contour.point.height > 0 && contour.isValide) {
                        this.strokeColor = this.rectBorderColorSuccess;
                        this.isImageCaptured = true;
                        // Object found : trigger callback
                        callback();
                    }
                    // Draw contour
                    if (this.drawContour) {
                        this.drawContours(context, contour, x, y);
                    }
                }
            }
        }
    };
    // Draw contour
    Detector.prototype.drawContours = function (context, contour, x, y) {
        context.strokeStyle = contour.isValide ? 'blue' : 'red';
        context.beginPath();
        for (var j = 0; j < contour.length; ++j) {
            var point = contour[j];
            context.moveTo(x + point.x, y + point.y);
            point = contour[(j + 1) % contour.length];
            context.lineTo(x + point.x, y + point.y);
        }
        context.stroke();
        context.closePath();
    };
    // Crop image
    Detector.prototype.cropImage = function (context) {
        this.originalCanvas = cropImage(context, this.roundRectX + this.lineWidth, this.roundRectY + this.lineWidth, this.roundRectWidth - this.lineWidth * 2, this.roundRectHeight - this.lineWidth * 2);
        this.isImageCaptured = false;
        return this.originalCanvas.toDataURL(this.mimeType);
    };
    // Resize canvas
    Detector.prototype.resizeCanvas = function (callback) {
        if (!this.originalCanvas) {
            callback(null);
            return;
        }
        // Create canvas with dpi size (by default : 300)
        var dpmm = this.dpi / 25.4; // Pixels per mm = 300 dpi / 25.4 = 11.811 dpmm
        var pixelRatioWidth = Math.round(this.formattedRatio.w * dpmm); // by default (210 mm x 11.811 dpmm) : 2480 px
        var pixelRatioHeight = Math.round(this.formattedRatio.h * dpmm); // by default (297 mm x 11.811 dpmm) : 3508 px
        var resizedCanvas = document.createElement('canvas');
        resizedCanvas.width = pixelRatioWidth;
        resizedCanvas.height = pixelRatioHeight;
        var self = this;
        // Resize canvas
        canvasResize(self.originalCanvas, resizedCanvas, function () {
            // resized will now be a properly resized version of canvas
            var resizedBase64Data = resizedCanvas.toDataURL(self.mimeType);
            callback(resizedBase64Data);
        });
    };
    // Download image
    Detector.prototype.download = function (imageName, imageData) {
        var blob = getBlobFromImageData(imageData);
        var fileName = imageName + '.' + this.imageExtension;
        saveAs(blob, fileName);
    };
    // Convert base64 to file
    Detector.prototype.convertBase64toFile = function (imageName, base64Data, callback) {
        var fileName = imageName + '.' + this.imageExtension;
        base64toFile(base64Data, fileName, this.mimeType).then(callback);
    };
    // Get media track
    Detector.prototype.stopMediaTracks = function (stream) {
        stream.getTracks().forEach(function (track) {
            track.stop();
        });
    };
    // Get camera devices
    Detector.prototype.gotDevices = function (mediaDevices) {
        var self = this;
        var count = 1;
        try {
            self.videoInputList = [];
            mediaDevices.forEach(function (mediaDevice) {
                if (mediaDevice.kind === 'videoinput') {
                    var element = {
                        id: mediaDevice.deviceId,
                        label: mediaDevice.label || 'Camera' + count++
                    };
                    self.videoInputList.push(element);
                }
            });
        }
        catch (ex) { }
    };
    // Get camera stream
    Detector.prototype.getCamera = function (isDesktop, resolve, reject) {
        if (this.currentStream) {
            this.stopMediaTracks(this.currentStream);
        }
        var videoConstraints = {};
        if (isDesktop && !!this.videoInputList.length) {
            videoConstraints.deviceId = { exact: this.videoInputList[0].id };
        }
        else {
            videoConstraints.facingMode = 'environment';
        }
        var self = this;
        window
            .getUserMedia({
            video: videoConstraints,
            audio: false
        })
            .then(function (stream) {
            self.currentStream = stream;
            resolve(stream);
            return window.enumerateDevices();
        })
            .then(self.gotDevices)
            .catch(function (err) {
            reject(err);
        });
        window.enumerateDevices().then(self.gotDevices);
    };
    // Request animation frame
    Detector.prototype.requestAnimationFrame = function (tick) {
        this.raf = window.requestAnimationFrame(tick);
    };
    // Cancel animation frame
    Detector.prototype.cancelAnimationFrame = function () {
        if (this.raf) {
            window.cancelAnimationFrame(this.raf);
        }
    };
    return Detector;
}());

export default Detector;
//# sourceMappingURL=js-detector.es5.js.map

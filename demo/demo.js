'use strict';
var detector,
  video,
  canvas,
  context,
  attempts = 0,
  buttonCamera,
  buttonPrevious,
  imageDataUrl = '',
  isDesktop = true,
  showFakeImage = false,
  params = {
    ceil: 35,
    dpi: 300,
    ratio: { w: 210, h: 297 },
    width: 500,
    height: 400,
    lineWidth: 4,
    rectBorderDefaultColor: 'white',
    rectBorderColorSuccess: 'green',
    rectBorderColorError: 'red',
    outsideBackgroundColor: 'rgba(0, 0, 0, 0.3)',
    drawContour: true,
    mimeType: 'image/jpg',
    imageExtension: 'jpeg'
  };
var showElement = function(elementId) {
  var element = document.getElementById(elementId);
  if (element) element.style.display = 'block';
};
var hideElement = function(elementId) {
  var element = document.getElementById(elementId);
  if (element) element.style.display = 'none';
};
var addClass = function(elementId, className) {
  var element = document.getElementById(elementId);
  if (element) element.classList.add(className);
};
var removeClass = function(elementId, className) {
  var element = document.getElementById(elementId);
  if (element) element.classList.remove(className);
};
var initDetector = function() {
  try {
    detector = new Detector(params);
    video.width = detector.width > video.videoWidth ? detector.width : video.videoWidth;
    video.height = detector.height > video.videoHeight ? detector.height : video.videoHeight;
    canvas.width = detector.width;
    canvas.height = detector.height;
    context = canvas.getContext('2d');
    context.imageSmoothingEnabled = true;
    context.mozImageSmoothingEnabled = true;
    context.webkitImageSmoothingEnabled = true;
    context.msImageSmoothingEnabled = true;
    // init centered and outside rectangles coordinates
    detector.initRectCoordinates();
  } catch (ex) {}
};
// Set video stream
var setVideoStream = function(stream) {
  if ('srcObject' in video) {
    video.srcObject = stream;
  } else if (webkitURL && stream) {
    video.src = webkitURL.createObjectURL(stream);
  } else if ('mozSrcObject' in video) {
    video.mozSrcObject = stream;
  } else {
    video.src = stream;
  }
};
// Clear video stream
var clearVideoStream = function() {
  if (video) {
    video.pause();
    setVideoStream(null);
  }
};
// Init video stream
var getCamera = function() {
  detector.getCamera(
    isDesktop,
    function(stream) {
      try {
        setVideoStream(stream);
        setTimeout(function() {
          video.play();
        }, 500);
      } catch (ex) {}
    },
    function(error) {
      console.error(error.name + ' : ' + error.message);
    }
  );
};
var captureImage = function() {
  showFakeImage = true;
  removeClass('camera__footer', 'camera__footer--centered');
  showElement('camera__footer-image');
  showElement('button--previous');
  showElement('fake-img');
  video.pause();
  // Capture image
  imageDataUrl = detector.cropImage(context);
  setTimeout(function() {
    video.play();
    // Put image data in fake image
    var fakeImg = document.getElementById('fake-img');
    fakeImg.src = imageDataUrl;
    // Animate fake image
    fakeImg.classList.add('animate');
    setTimeout(function() {
      // Hide fake image
      showFakeImage = false;
      hideElement('fake-img');
      // Put image data in real image
      var dstImg = document.getElementById('croppedImg');
      dstImg.src = imageDataUrl;
      // Reset fake image
      fakeImg.classList.remove('animate');
      fakeImg.src = '';
    }, 1200);
  }, 100);
};
var isStreamInitialized = function() {
  return context && video.width && video.height;
};
// Watch video stream
var tick = function() {
  detector.requestAnimationFrame(tick);
  if (isStreamInitialized() && video.readyState === video.HAVE_ENOUGH_DATA) {
    // Draw image data
    detector.putImageData(context, video);
    // Draw rectangle
    detector.drawRectangle(context);
    if (!showFakeImage) {
      // Detect Object
      detector.detect(context, function() {
        setTimeout(function() {
          // Capture image
          captureImage();
        }, 300);
      });
    }
  }
};
var onDimensionsReady = function() {
  initDetector();
  detector.requestAnimationFrame(tick);
};
var findVideoSize = function() {
  if (video.videoWidth > 0 && video.videoHeight > 0) {
    video.removeEventListener('loadeddata', readyListener);
    onDimensionsReady();
  } else {
    if (attempts < 10) {
      attempts++;
      setTimeout(findVideoSize, 200);
    } else {
      onDimensionsReady();
    }
  }
};
var readyListener = function(/*event*/) {
  findVideoSize();
};
var validate = function() {
  addClass('camera__footer', 'camera__footer--centered');
  hideElement('camera__footer-image');
  hideElement('button--previous');
  // Resize canvas
  detector.resizeCanvas(function(base64Data) {
    // Download file
    detector.download('test', base64Data);
  });
};
var onLoad = function() {
  video = document.getElementById('video');
  canvas = document.getElementById('canvas');
  detector = new Detector(params);
  if (video) {
    video.addEventListener('loadeddata', readyListener);
  }
  buttonCamera = document.getElementById('button--camera');
  if (buttonCamera) {
    buttonCamera.addEventListener('click', function(event) {
      captureImage();
    });
  }
  buttonPrevious = document.getElementById('button--previous');
  if (buttonPrevious) {
    buttonPrevious.addEventListener('click', function(event) {
      validate();
    });
  }
  window.addEventListener('resize', getCamera, false);
  getCamera();
};
var onUnLoad = function() {
  detector.cancelAnimationFrame();
  clearVideoStream();
};
window.onload = onLoad;
window.onunload = onUnLoad;

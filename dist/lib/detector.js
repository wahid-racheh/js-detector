"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var cv_1 = require("./cv");
var utils_1 = require("./utils");
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
        this.cropContainer = cv_1.getRectCoordinates(this.roundRectX, this.roundRectY, this.roundRectWidth, this.roundRectHeight);
        this.outsideRectCoordinates = cv_1.getOutsideRectCoordinates(this.ceil, this.width, this.cropContainer.tl.x, this.cropContainer.tl.y, this.cropContainer.tr.x, this.cropContainer.tr.y, this.cropContainer.bl.y, this.roundRectWidth, this.roundRectHeight);
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
            cv_1.clipRect(context, this.outsideRectCoordinates, this.outsideBackgroundColor);
        }
        // Draw rectangle
        cv_1.drawRect(context, this.roundRectX, this.roundRectY, this.roundRectWidth, this.roundRectHeight, this.lineWidth, this.strokeColor);
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
        var candidates = cv_1.detectContour(this.imageData, this.ceil);
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
                    contour.isValide = cv_1.isValidPoint(contour.point, this.cropContainer, 5);
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
        this.originalCanvas = cv_1.cropImage(context, this.roundRectX + this.lineWidth, this.roundRectY + this.lineWidth, this.roundRectWidth - this.lineWidth * 2, this.roundRectHeight - this.lineWidth * 2);
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
        var blob = utils_1.getBlobFromImageData(imageData);
        var fileName = imageName + '.' + this.imageExtension;
        saveAs(blob, fileName);
    };
    // Convert base64 to file
    Detector.prototype.convertBase64toFile = function (imageName, base64Data, callback) {
        var fileName = imageName + '.' + this.imageExtension;
        utils_1.base64toFile(base64Data, fileName, this.mimeType).then(callback);
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
exports.default = Detector;
//# sourceMappingURL=detector.js.map
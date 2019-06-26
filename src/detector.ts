declare var window: any;
declare var canvasResize: any;
declare var saveAs: any;

import {
  getRectCoordinates,
  getOutsideRectCoordinates,
  clipRect,
  drawRect,
  detectContour,
  isValidPoint,
  cropImage
} from './cv';
import { IRatio, IVideoInput, IDetector } from './interfaces';

import { getBlobFromImageData, base64toFile } from './utils';

export default class Detector {
  private ceil: number;
  private width: number;
  private height: number;
  private lineWidth: number;
  private dpi: number;

  private rectBorderDefaultColor: string;
  private rectBorderColorSuccess: string;
  private rectBorderColorError: string;
  private outsideBackgroundColor: string;

  private drawContour = false;
  private isImageCaptured = false;

  private mimeType: string;
  private imageExtension: string;

  private originalCanvas: any;
  private cropContainer: any;
  private outsideRectCoordinates: any;
  private imageData: any;
  private strokeColor: string;

  private currentStream: any;
  private videoInputList: Array<IVideoInput>;
  private raf: any;

  private roundRectX: number;
  private roundRectY: number;
  private roundRectWidth: number;
  private roundRectHeight: number;

  private ratio: IRatio;
  private formattedRatio: IRatio;

  constructor(options: IDetector) {
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

  initRectRatio(ratio: number, w: number, h: number, ceil: number) {
    let obj: any = {};
    let canvasRatio: number = w / h;
    const assign = (mainProp: string, dependentProp: string, r: number, canvasProp: number) => {
      if (w <= h) {
        obj[mainProp] = canvasProp - ceil * 2;
        obj[dependentProp] = obj[mainProp] * r;
      } else {
        obj[dependentProp] = canvasProp - ceil * 2;
        obj[mainProp] = obj[dependentProp] * r;
      }
    };
    if (w === h || canvasRatio > 1) {
      assign('h', 'w', 1 / ratio, h);
    } else if (canvasRatio < ratio) {
      assign('h', 'w', ratio, h);
    } else {
      assign('w', 'h', 1 / ratio, w);
    }
    obj.x = (w - obj.w) / 2;
    obj.y = (h - obj.h) / 2;
    return obj;
  }

  // Init rectangle coordinates
  initRectCoordinates() {
    this.formattedRatio.w = this.ratio.w;
    this.formattedRatio.h = this.ratio.h;
    if (this.width >= this.height) {
      this.formattedRatio.w = this.ratio.h;
      this.formattedRatio.h = this.ratio.w;
    }

    let ratio: number = this.formattedRatio.w / this.formattedRatio.h;
    let rectangle: any = this.initRectRatio(ratio, this.width, this.height, this.ceil);

    this.roundRectX = rectangle.x;
    this.roundRectY = rectangle.y;
    this.roundRectWidth = rectangle.w;
    this.roundRectHeight = rectangle.h;

    // Get centered rectangle coordinates
    this.cropContainer = getRectCoordinates(
      this.roundRectX,
      this.roundRectY,
      this.roundRectWidth,
      this.roundRectHeight
    );

    this.outsideRectCoordinates = getOutsideRectCoordinates(
      this.ceil,
      this.width,
      this.cropContainer.tl.x,
      this.cropContainer.tl.y,
      this.cropContainer.tr.x,
      this.cropContainer.tr.y,
      this.cropContainer.bl.y,
      this.roundRectWidth,
      this.roundRectHeight
    );
  }

  // Draw image data
  putImageData(context: any, video: any) {
    // Hack to center stream on mobile devices
    let dx: number = 0;
    let innerWidth: number = window.innerWidth;
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
  }

  drawRectangle(context: any) {
    // Draw outside rectangle
    if (this.outsideRectCoordinates) {
      clipRect(context, this.outsideRectCoordinates, this.outsideBackgroundColor);
    }

    // Draw rectangle
    drawRect(
      context,
      this.roundRectX,
      this.roundRectY,
      this.roundRectWidth,
      this.roundRectHeight,
      this.lineWidth,
      this.strokeColor
    );

    // Update border color
    if (!this.isImageCaptured) {
      this.strokeColor = this.rectBorderDefaultColor;
    }
  }

  // Detect object
  detect(context: any, callback: Function) {
    if (!this.imageData) {
      callback();
      return;
    }

    // Detect contours
    var candidates: Array<any>[] = detectContour(this.imageData, this.ceil);

    let self: any = this;
    // Find object
    self.findObject(context, candidates, 0, 0, () => {
      let timeout: any = window.setTimeout(() => {
        self.isImageCaptured = false;
        window.clearTimeout(timeout);
      }, 2000);
      callback();
    });
  }

  // Find object
  findObject(context: any, contours: Array<any>[], x: number, y: number, callback: Function) {
    let i: number = contours.length,
      contour: any;
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
  }

  // Draw contour
  drawContours(context: any, contour: any, x: number, y: number) {
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
  }

  // Crop image
  cropImage(context: any) {
    this.originalCanvas = cropImage(
      context,
      this.roundRectX + this.lineWidth,
      this.roundRectY + this.lineWidth,
      this.roundRectWidth - this.lineWidth * 2,
      this.roundRectHeight - this.lineWidth * 2
    );

    this.isImageCaptured = false;

    return this.originalCanvas.toDataURL(this.mimeType);
  }

  // Resize canvas
  resizeCanvas(callback: Function) {
    if (!this.originalCanvas) {
      callback(null);
      return;
    }

    // Create canvas with dpi size (by default : 300)
    let dpmm: number = this.dpi / 25.4; // Pixels per mm = 300 dpi / 25.4 = 11.811 dpmm
    let pixelRatioWidth: number = Math.round(this.formattedRatio.w * dpmm); // by default (210 mm x 11.811 dpmm) : 2480 px
    let pixelRatioHeight: number = Math.round(this.formattedRatio.h * dpmm); // by default (297 mm x 11.811 dpmm) : 3508 px

    let resizedCanvas: any = document.createElement('canvas');
    resizedCanvas.width = pixelRatioWidth;
    resizedCanvas.height = pixelRatioHeight;

    let self: any = this;
    // Resize canvas
    canvasResize(self.originalCanvas, resizedCanvas, () => {
      // resized will now be a properly resized version of canvas
      let resizedBase64Data: string = resizedCanvas.toDataURL(self.mimeType);
      callback(resizedBase64Data);
    });
  }

  // Download image
  download(imageName: string, imageData: any) {
    let blob: any = getBlobFromImageData(imageData);
    let fileName: string = imageName + '.' + this.imageExtension;
    saveAs(blob, fileName);
  }

  // Convert base64 to file
  convertBase64toFile(imageName: string, base64Data: string, callback: any) {
    let fileName: string = imageName + '.' + this.imageExtension;
    base64toFile(base64Data, fileName, this.mimeType).then(callback);
  }

  // Get media track
  stopMediaTracks(stream: any) {
    stream.getTracks().forEach((track: any) => {
      track.stop();
    });
  }

  // Get camera devices
  gotDevices(mediaDevices: Array<any>[]) {
    let self: any = this;
    let count: number = 1;
    try {
      self.videoInputList = [];
      mediaDevices.forEach((mediaDevice: any) => {
        if (mediaDevice.kind === 'videoinput') {
          const element: IVideoInput = {
            id: mediaDevice.deviceId,
            label: mediaDevice.label || 'Camera' + count++
          };
          self.videoInputList.push(element);
        }
      });
    } catch (ex) {}
  }

  // Get camera stream
  getCamera(isDesktop: boolean, resolve: any, reject: any) {
    if (this.currentStream) {
      this.stopMediaTracks(this.currentStream);
    }

    var videoConstraints: any = {};
    if (isDesktop && !!this.videoInputList.length) {
      videoConstraints.deviceId = { exact: this.videoInputList[0].id };
    } else {
      videoConstraints.facingMode = 'environment';
    }

    let self: any = this;

    window
      .getUserMedia({
        video: videoConstraints,
        audio: false
      })
      .then((stream: any) => {
        self.currentStream = stream;
        resolve(stream);
        return window.enumerateDevices();
      })
      .then(self.gotDevices)
      .catch((err: any) => {
        reject(err);
      });

    window.enumerateDevices().then(self.gotDevices);
  }

  // Request animation frame
  requestAnimationFrame(tick: any) {
    this.raf = window.requestAnimationFrame(tick);
  }

  // Cancel animation frame
  cancelAnimationFrame() {
    if (this.raf) {
      window.cancelAnimationFrame(this.raf);
    }
  }
}

# [js-detector](https://github.com/wahid-racheh/js-detector)

js-detector is a minimal javascript library based on **[OpenCv](https://github.com/jcmellado/js-aruco/blob/master/src/cv.js)** .
It aims to do a real-time object detection using modern HTML5 specifications.

### Live demo

https://js-detector-demo.netlify.com/demo/

### NPM scripts

- `npm t`: Run test suite
- `npm run build`: Generate bundles and typings, create docs
- `npm run lint`: Lints code
- `npm run start`: start demo on http://localhost:8081/demo

### Setup

Add a reference for your library folder in package.json file

```json
"dependencies": {
  "js-detector": "file:[path-of-your-local-directory]/js-detector",
}
```

And then, run the following command to install it in your node local repositery

```sh
npm install js-detector
```

### Importing library

You can import your library by using the following line :

```javascript
import Detector from 'js-detector';
```

Or using RequireJS

```javascript
var Detector = require('js-detector');
```

Or in yout html file

```html
<script type="text/javascript" src="node_modules/js-detector/dist/js-detector.umd.js"></script>
```

Additionally, you can import the transpiled modules from **`node_modules/js-detector/dist/lib`** folder

**That's it!** now, you're ready to use it!

## Usage

- Now that you have your your library initiated, it's time to understand how the detector API works,
  first you need to get camera and track the stream :

```javascript
  // Get camera stream
  detector.getCamera(/*isDesktop*/, (stream: any) => {
    // Set your stream here

  }, (error) => {
    console.error(error.name + ' : ' + error.message);
  });

  detector.requestAnimationFrame(/*track_function*/);
```

- Once the camera is loaded, you need to instantiate the constructor passing the option parameters :

```javascript
// Instantiate the detector
let detector: Detector = new Detector({
  ceil: 35, // Detection zone padding
  dpi: 300, // Captured image resolution
  ratio: { w: 210, h: 297 }, // Format ratio, by default A4 format
  width: 400, // canvas width
  height: 600, // canvas height
  lineWidth: 4, // Detection zone border width
  rectBorderDefaultColor: 'white', // detection zone border default color
  rectBorderColorSuccess: 'green', // detection zone border success color
  rectBorderColorError: 'red', // detection zone border error color
  outsideBackgroundColor: 'rgba(0, 0, 0, 0.3)', // canvas background opacity
  drawContour: true, // enable draw contour
  mimeType: 'image/jpg', // canvas export extension
  imageExtension: 'jpeg' // image extension
});
```

- Then, you need to initialize your **canvas**, **the context** and **the detection zone** :

```javascript
let video: any = document.getElementById('video');
let canvas: any = document.getElementById('canvas');

video.width = video.videoWidth;
video.height = video.videoHeight;

canvas.width = detector.width;
canvas.height = detector.height;

let context: any = canvas.getContext('2d');

detector.initRectCoordinates();
```

Then, you need to implement the **track_function** for your detector.
It will render image data into canvas and make a fast object detection.
When the detection is done, the callback will be triggered to notify that the object is found :

```javascript
  const track_function = () => {
    detector.requestAnimationFrame(track_function);

    if (/* video is ready */){

      // Draw image data
      detector.putImageData(context, video);

      // Draw rectangle
      detector.drawRectangle(context);

      // Detect Object
      detector.detect(context, () => {

        // Your code is here
        // Object found
      });
    }
  };
```

That's it! You can now crop detected object:

```javascript
// Crop image : return base64 data
const base64data: string = detector.cropImage(context);
```

Other features, You can resize the canvas, get the binary and download the file :

```javascript
// Resize canvas
detector.resizeCanvas((base64Data: string) => {
  // Convert base64 to file
  detector.convertBase64toFile('file-name', base64Data, (file: any) => {
    // Your binary file here

    // Download image
    detector.download('file-name', base64Data);
  });
});
```

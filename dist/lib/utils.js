"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// return a promise that resolves with a File instance
// Usage example:
// base64toFile('data:text/plain;base64,aGVsbG8gd29ybGQ=', 'hello.txt', 'text/plain').then(function(file){console.log(file);});
exports.base64toFile = function (url, filename, mimeType) {
    return fetch(url)
        .then(function (res) {
        return res.arrayBuffer();
    })
        .then(function (buf) {
        return new File([buf], filename, { type: mimeType });
    });
};
exports.getBlobFromImageData = function (image_data) {
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
//# sourceMappingURL=utils.js.map
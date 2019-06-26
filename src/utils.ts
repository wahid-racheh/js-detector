declare var window: any;

// return a promise that resolves with a File instance
// Usage example:
// base64toFile('data:text/plain;base64,aGVsbG8gd29ybGQ=', 'hello.txt', 'text/plain').then(function(file){console.log(file);});
export const base64toFile = (url: string, filename: string, mimeType: string) => {
  return fetch(url)
    .then(res => {
      return res.arrayBuffer();
    })
    .then(buf => {
      return new File([buf], filename, { type: mimeType });
    });
};

export const getBlobFromImageData = (image_data: string) => {
  let blob: any;

  const parsedImageData = atob(image_data.split(',')[1]);

  // Use typed arrays to convert the binary data to a Blob
  let arraybuffer = new ArrayBuffer(parsedImageData.length);
  let view = new Uint8Array(arraybuffer);

  for (let i = 0; i < parsedImageData.length; i++) {
    view[i] = parsedImageData.charCodeAt(i) & 0xff;
  }

  try {
    // This is the recommended method:
    blob = new Blob([arraybuffer], {
      type: 'application/octet-stream'
    });
  } catch (e) {
    // The BlobBuilder API has been deprecated in favour of Blob, but older
    // browsers don't know about the Blob constructor
    // IE10 also supports BlobBuilder, but since the `Blob` constructor
    //  also works, there's no need to add `MSBlobBuilder`.
    let bb = new (window.WebKitBlobBuilder || window.MozBlobBuilder)();
    bb.append(arraybuffer);
    blob = bb.getBlob('application/octet-stream'); // <-- Here's the Blob
  }

  return blob;
};

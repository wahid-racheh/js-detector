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

import { ICoordinate, IImage, IBlurStack, IPoint, IRect } from './interfaces';
import { stackBoxBlurMult, stackBoxBlurShift, neighborhood } from './constants';

export const blurStack = (): IBlurStack => {
  return {
    color: 0,
    next: null
  };
};

export const getImage = (image?: IImage): IImage => {
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

export const grayscaleOld = (imageSrc: IImage, imageDst: IImage): IImage => {
  let src: any[] = imageSrc.data,
    dst: any[] = imageDst.data,
    len: number = src.length,
    i: number = 0,
    j: number = 0;

  for (; i < len; i += 4) {
    dst[j++] = (src[i] * 0.299 + src[i + 1] * 0.587 + src[i + 2] * 0.114 + 0.5) & 0xff;
  }

  imageDst.width = imageSrc.width;
  imageDst.height = imageSrc.height;

  return imageDst;
};

export const grayscale = (imageSrc: IImage, imageDst: IImage): IImage => {
  let src: any[] = imageSrc.data,
    dst: any[] = imageDst.data;
  let len: number = src.length | 0,
    srcLength_16: number = (len - 16) | 0;

  let i: number = 0,
    j: number = 0;
  let coeff_r: number = 0.6,
    coeff_g: number = 0.9,
    coeff_b: number = 0.2;
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

export const threshold = (imageSrc: IImage, imageDst: IImage, threshold: number): IImage => {
  let src: any[] = imageSrc.data,
    dst: any[] = imageDst.data,
    len: number = src.length,
    tab: any[] = [],
    i: number;

  for (i = 0; i < 256; ++i) {
    tab[i] = i <= threshold ? 0 : 255;
  }

  for (i = 0; i < len; ++i) {
    dst[i] = tab[src[i]];
  }

  imageDst.width = imageSrc.width;
  imageDst.height = imageSrc.height;

  return imageDst;
};

export const stackBoxBlur = (imageSrc: IImage, imageDst: IImage, kernelSize: number): IImage => {
  let src: any[] = imageSrc.data,
    dst: any[] = imageDst.data,
    height: number = imageSrc.height,
    width: number = imageSrc.width,
    heightMinus1: number = height - 1,
    widthMinus1: number = width - 1,
    size: number = kernelSize + kernelSize + 1,
    radius: number = kernelSize + 1,
    mult: number = stackBoxBlurMult[kernelSize],
    shift: number = stackBoxBlurShift[kernelSize],
    stack: IBlurStack,
    stackStart: IBlurStack,
    color: number,
    sum: number,
    pos: number,
    start: number,
    p: number,
    x: number,
    y: number,
    i: number;

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

export const adaptiveThreshold = (
  imageSrc: IImage,
  imageDst: IImage,
  kernelSize: number,
  threshold: number
): IImage => {
  let src: any[] = imageSrc.data,
    dst: any[] = imageDst.data,
    len: number = src.length,
    tab: any[] = [],
    i: number;

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

export const otsu = (imageSrc: IImage): number => {
  let src: any[] = imageSrc.data,
    len: number = src.length,
    hist: any[] = [],
    threshold: number = 0,
    sum: number = 0,
    sumB: number = 0,
    wB: number = 0,
    wF: number = 0,
    max: number = 0,
    mu: number,
    between: number,
    i: number;

  for (i = 0; i < 256; ++i) {
    hist[i] = 0;
  }

  for (i = 0; i < len; ++i) {
    hist[src[i]]++;
  }

  for (i = 0; i < 256; ++i) {
    sum += hist[i] * i;
  }

  for (i = 0; i < 256; ++i) {
    wB += hist[i];
    if (0 !== wB) {
      wF = len - wB;
      if (0 === wF) {
        break;
      }

      sumB += hist[i] * i;

      mu = sumB / wB - (sum - sumB) / wF;

      between = wB * wF * mu * mu;

      if (between > max) {
        max = between;
        threshold = i;
      }
    }
  }

  return threshold;
};

export const gaussianKernel = (kernelSize: number): any[] => {
  let tab: any[] = [
      [1],
      [0.25, 0.5, 0.25],
      [0.0625, 0.25, 0.375, 0.25, 0.0625],
      [0.03125, 0.109375, 0.21875, 0.28125, 0.21875, 0.109375, 0.03125]
    ],
    kernel: any[] = [],
    center: number,
    sigma: number,
    scale2X: number,
    sum: number,
    x: number,
    i: number;

  if (kernelSize <= 7 && kernelSize % 2 === 1) {
    kernel = tab[kernelSize >> 1];
  } else {
    center = (kernelSize - 1.0) * 0.5;
    sigma = 0.8 + 0.3 * (center - 1.0);
    scale2X = -0.5 / (sigma * sigma);
    sum = 0.0;
    for (i = 0; i < kernelSize; ++i) {
      x = i - center;
      sum += kernel[i] = Math.exp(scale2X * x * x);
    }
    sum = 1 / sum;
    for (i = 0; i < kernelSize; ++i) {
      kernel[i] *= sum;
    }
  }

  return kernel;
};

export const gaussianBlurFilter = (
  imageSrc: IImage,
  imageDst: IImage,
  kernel: any[],
  horizontal: boolean
): IImage => {
  let src: any[] = imageSrc.data,
    dst: any[] = imageDst.data,
    height: number = imageSrc.height,
    width: number = imageSrc.width,
    pos: number = 0,
    limit: number = kernel.length >> 1,
    cur: number,
    value: number,
    i: number,
    j: number,
    k: number;

  for (i = 0; i < height; ++i) {
    for (j = 0; j < width; ++j) {
      value = 0.0;

      for (k = -limit; k <= limit; ++k) {
        if (horizontal) {
          cur = pos + k;
          if (j + k < 0) {
            cur = pos;
          } else if (j + k >= width) {
            cur = pos;
          }
        } else {
          cur = pos + k * width;
          if (i + k < 0) {
            cur = pos;
          } else if (i + k >= height) {
            cur = pos;
          }
        }

        value += kernel[limit + k] * src[cur];
      }

      dst[pos++] = horizontal ? value : (value + 0.5) & 0xff;
    }
  }

  return imageDst;
};

export const gaussianBlur = (
  imageSrc: IImage,
  imageDst: IImage,
  imageMean: IImage,
  kernelSize: number
): IImage => {
  let kernel = gaussianKernel(kernelSize);

  imageDst.width = imageSrc.width;
  imageDst.height = imageSrc.height;

  imageMean.width = imageSrc.width;
  imageMean.height = imageSrc.height;

  gaussianBlurFilter(imageSrc, imageMean, kernel, true);
  gaussianBlurFilter(imageMean, imageDst, kernel, false);

  return imageDst;
};

export const binaryBorder = (imageSrc: IImage, dst: any[]): any[] => {
  let src: any[] = imageSrc.data,
    height: number = imageSrc.height,
    width: number = imageSrc.width,
    posSrc: number = 0,
    posDst: number = 0,
    i: number,
    j: number;

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

export const neighborhoodDeltas = (width: number): any[] => {
  let deltas: any[] = [],
    len: number = neighborhood.length,
    i: number = 0;

  for (; i < len; ++i) {
    deltas[i] = neighborhood[i][0] + neighborhood[i][1] * width;
  }

  return deltas.concat(deltas);
};

export const borderFollowing = (
  src: any[],
  pos: number,
  nbd: number,
  point: any,
  hole: boolean,
  deltas: any[]
) => {
  let contour: any[] = [],
    pos1: number,
    pos3: number,
    pos4: number,
    s: any,
    s_end: any,
    s_prev: any;

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
  } else {
    pos3 = pos;
    s_prev = s ^ 4;

    while (true) {
      s_end = s;

      do {
        pos4 = pos3 + deltas[++s];
      } while (src[pos4] === 0);

      s &= 7;

      if ((s - 1) >>> 0 < s_end >>> 0) {
        src[pos3] = -nbd;
      } else if (src[pos3] === 1) {
        src[pos3] = nbd;
      }

      contour.push({ x: point.x, y: point.y });

      s_prev = s;

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

export const findContours = (imageSrc: IImage, binary: any[]) => {
  let width: number = imageSrc.width,
    height: number = imageSrc.height,
    contours: any[] = [],
    src: any[],
    deltas: any[],
    pos: number,
    pix: any,
    nbd: number,
    outer: boolean,
    hole: boolean,
    i: number,
    j: number;

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
        } else if (pix >= 1 && 0 === src[pos + 1]) {
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

export const approxPolyDP = (contour: any, epsilon: number) => {
  let slice: any = { start_index: 0, end_index: 0 },
    right_slice: any = { start_index: 0, end_index: 0 },
    poly: any[] = [],
    stack: any[] = [],
    len: number = contour.length,
    pt: IPoint,
    start_pt: IPoint = { x: 0, y: 0 },
    end_pt: IPoint = { x: 0, y: 0 },
    dist: number,
    max_dist: number = 0,
    le_eps: boolean,
    dx: number,
    dy: number,
    i: number,
    j: number,
    k: number;

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
  } else {
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
    } else {
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
    } else {
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

export const isContourConvex = (contour: any) => {
  let orientation: number = 0,
    convex: boolean = true,
    len: number = contour.length,
    i: number = 0,
    j: number = 0,
    cur_pt: IPoint,
    prev_pt: IPoint,
    dxdy0: number,
    dydx0: number,
    dx0: number,
    dy0: number,
    dx: number,
    dy: number;

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

export const getRectSize = (
  x: number,
  y: number,
  tl: IPoint,
  tr: IPoint,
  bl: IPoint,
  br: IPoint
): IRect => {
  // Calculate the max width/height
  let wb: number = Math.hypot(br.x - bl.x, br.y - bl.y);
  let wt: number = Math.hypot(tr.x - tl.x, tr.y - tl.y);
  let w: number = wb > wt ? wb : wt;
  let hr: number = Math.hypot(tr.x - br.x, tr.y - br.y);
  let hl: number = Math.hypot(tl.x - bl.x, tr.y - bl.y);
  let h: number = hr > hl ? hr : hl;

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

export const findCornersPosition = (contour: any): IRect => {
  const cornerArray = [contour[3], contour[0], contour[2], contour[1]];
  //Determine left/right based on x position of top and bottom 2
  const tl = cornerArray[0].x < cornerArray[1].x ? cornerArray[0] : cornerArray[1];
  const tr = cornerArray[0].x > cornerArray[1].x ? cornerArray[0] : cornerArray[1];
  const bl = cornerArray[2].x < cornerArray[3].x ? cornerArray[2] : cornerArray[3];
  const br = cornerArray[2].x > cornerArray[3].x ? cornerArray[2] : cornerArray[3];

  return getRectSize(cornerArray[0].x, cornerArray[0].y, tl, tr, bl, br);
};

export const minEdgeLength = (poly: any): number => {
  let len: number = poly.length,
    i: number = 0,
    j: number = len - 1,
    min: any = Infinity,
    d: number,
    dx: number,
    dy: number;

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

export const findCandidates = (
  contours: any[],
  minSize: number,
  epsilon: number,
  minLength: number,
  minLimit: number
) => {
  let candidates: any[] = [],
    len: number = contours.length,
    contour: any,
    poly: any,
    i: number;

  for (i = 0; i < len; ++i) {
    contour = contours[i];

    if (contour.length >= minSize) {
      poly = approxPolyDP(contour, contour.length * epsilon);

      if (poly.length === 4 && isContourConvex(poly)) {
        poly.point = findCornersPosition(poly);

        const min = minEdgeLength(poly);

        poly.hasValidEdgeLength = min >= minLimit;

        if (min >= minLength) {
          candidates.push(poly);
        }
      }
    }
  }

  return candidates;
};

export const detectContour = (image: IImage, ceil: number) => {
  let grey: IImage = getImage();
  let thres: IImage = getImage();
  let binary: any[] = [];

  grayscale(image, grey);
  adaptiveThreshold(grey, thres, 2, 1);

  let contours: any = findContours(thres, binary);

  let size: number = image.width < image.height ? image.width : image.height;
  let candidates: any = findCandidates(
    contours,
    image.width * 0.2,
    0.05,
    100,
    size - (ceil * 2 + 20)
  );

  return candidates;
};

export const square2quad = (src: IPoint[]) => {
  let sq: any[] = [],
    px: number,
    py: number,
    dx1: number,
    dx2: number,
    dy1: number,
    dy2: number,
    den: number;

  px = src[0].x - src[1].x + src[2].x - src[3].x;
  py = src[0].y - src[1].y + src[2].y - src[3].y;

  if (0 === px && 0 === py) {
    sq[0] = src[1].x - src[0].x;
    sq[1] = src[2].x - src[1].x;
    sq[2] = src[0].x;
    sq[3] = src[1].y - src[0].y;
    sq[4] = src[2].y - src[1].y;
    sq[5] = src[0].y;
    sq[6] = 0;
    sq[7] = 0;
    sq[8] = 1;
  } else {
    dx1 = src[1].x - src[2].x;
    dx2 = src[3].x - src[2].x;
    dy1 = src[1].y - src[2].y;
    dy2 = src[3].y - src[2].y;
    den = dx1 * dy2 - dx2 * dy1;

    sq[6] = (px * dy2 - dx2 * py) / den;
    sq[7] = (dx1 * py - px * dy1) / den;
    sq[8] = 1;
    sq[0] = src[1].x - src[0].x + sq[6] * src[1].x;
    sq[1] = src[3].x - src[0].x + sq[7] * src[3].x;
    sq[2] = src[0].x;
    sq[3] = src[1].y - src[0].y + sq[6] * src[1].y;
    sq[4] = src[3].y - src[0].y + sq[7] * src[3].y;
    sq[5] = src[0].y;
  }

  return sq;
};

export const getPerspectiveTransform = (src: IPoint[], size: number) => {
  let rq: any = square2quad(src);

  rq[0] /= size;
  rq[1] /= size;
  rq[3] /= size;
  rq[4] /= size;
  rq[6] /= size;
  rq[7] /= size;

  return rq;
};

export const warp = (
  imageSrc: IImage,
  imageDst: IImage,
  contour: any,
  warpSize: number
): IImage => {
  let src: any[] = imageSrc.data,
    dst: any[] = imageDst.data,
    width: number = imageSrc.width,
    height: number = imageSrc.height,
    pos: number = 0,
    sx1: number,
    sx2: number,
    dx1: number,
    dx2: number,
    sy1: number,
    sy2: number,
    dy1: number,
    dy2: number,
    p1: number,
    p2: number,
    p3: number,
    p4: number,
    m: any,
    r: number,
    s: number,
    t: number,
    u: number,
    v: number,
    w: number,
    x: number,
    y: number,
    i: number,
    j: number;

  m = getPerspectiveTransform(contour, warpSize - 1);

  r = m[8];
  s = m[2];
  t = m[5];

  for (i = 0; i < warpSize; ++i) {
    r += m[7];
    s += m[1];
    t += m[4];

    u = r;
    v = s;
    w = t;

    for (j = 0; j < warpSize; ++j) {
      u += m[6];
      v += m[0];
      w += m[3];

      x = v / u;
      y = w / u;

      sx1 = x >>> 0;
      sx2 = sx1 === width - 1 ? sx1 : sx1 + 1;
      dx1 = x - sx1;
      dx2 = 1.0 - dx1;

      sy1 = y >>> 0;
      sy2 = sy1 === height - 1 ? sy1 : sy1 + 1;
      dy1 = y - sy1;
      dy2 = 1.0 - dy1;

      p1 = p2 = sy1 * width;
      p3 = p4 = sy2 * width;

      dst[pos++] =
        (dy2 * (dx2 * src[p1 + sx1] + dx1 * src[p2 + sx2]) +
          dy1 * (dx2 * src[p3 + sx1] + dx1 * src[p4 + sx2])) &
        0xff;
    }
  }

  imageDst.width = warpSize;
  imageDst.height = warpSize;

  return imageDst;
};

export const perimeter = (poly: any): number => {
  let len: number = poly.length,
    i: number = 0,
    j: number = len - 1,
    p: number = 0.0,
    dx: number,
    dy: number;

  for (; i < len; j = i++) {
    dx = poly[i].x - poly[j].x;
    dy = poly[i].y - poly[j].y;

    p += Math.sqrt(dx * dx + dy * dy);
  }

  return p;
};

export const countNonZero = (imageSrc: IImage, square: IPoint): number => {
  let src: any = imageSrc.data,
    height: number = square.height || 0,
    width: number = square.width || 0,
    pos: number = square.x + square.y * imageSrc.width,
    span: number = imageSrc.width - width,
    nz: number = 0,
    i: number,
    j: number;

  for (i = 0; i < height; ++i) {
    for (j = 0; j < width; ++j) {
      if (0 !== src[pos++]) {
        ++nz;
      }
    }

    pos += span;
  }

  return nz;
};

export const isValidPoint = (p1: IRect, p2: IRect, ceil: number): boolean => {
  const isValidTlx = p1.tl.x >= p2.tl.x - ceil;
  const isValidTly = p1.tl.y >= p2.tl.y - ceil;

  const isValidTrx = p1.tr.x <= p2.tr.x + ceil;
  const isValidTry = p1.tr.y >= p2.tr.y - ceil;

  const isValidBlx = p1.bl.x >= p2.bl.x - ceil;
  const isValidBly = p1.bl.y <= p2.bl.y + ceil;

  const isValidBrx = p1.br.x <= p2.br.x + ceil;
  const isValidBry = p1.br.y <= p2.br.y + ceil;

  const isValidTx = p1.tl.x <= p2.tl.x + ceil;
  const isValidBx = p1.br.x >= p2.br.x - ceil;

  const isValidTy = p1.tl.y <= p2.tl.y + ceil;
  const isValidBy = p1.br.y >= p2.br.y - ceil;

  return (
    isValidTlx &&
    isValidTly &&
    isValidTrx &&
    isValidTry &&
    isValidBlx &&
    isValidBly &&
    isValidBrx &&
    isValidBry &&
    ((isValidTx && isValidBx) || (isValidTy && isValidBy))
  );
};

export const diff = (num1: number, num2: number): number => {
  if (num1 > num2) {
    return num1 - num2;
  } else {
    return num2 - num1;
  }
};

export const distance = (x1: number, x2: number, y1: number, y2: number): number => {
  var deltaX = diff(x1, x2);
  var deltaY = diff(y1, y2);
  var dist = Math.sqrt(Math.pow(deltaX, 2) + Math.pow(deltaY, 2));
  return dist;
};

export const getRectCoordinates = (
  x: number,
  y: number,
  width: number,
  height: number,
  radius?: any
): IRect => {
  if (typeof radius === 'undefined') {
    radius = 1;
  }
  if (typeof radius === 'number') {
    radius = { tl: radius, tr: radius, br: radius, bl: radius };
  } else {
    let defaultRadius: any = { tl: 0, tr: 0, br: 0, bl: 0 };
    let keys = Object.keys(defaultRadius);
    for (let i = 0; i < keys.length; i++) {
      let side = keys[i];
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
export const drawRect = (
  ctx: any,
  x: number,
  y: number,
  width: number,
  height: number,
  lineWidth: number,
  color: string,
  radius?: any,
  fill?: any,
  stroke?: boolean
) => {
  if (typeof stroke === 'undefined') {
    stroke = true;
  }

  let rectCoordinate: IRect = getRectCoordinates(x, y, width, height, radius);
  // Draw lines
  ctx.beginPath();
  ctx.lineWidth = lineWidth;
  ctx.strokeStyle = color;
  ctx.moveTo(rectCoordinate.x + rectCoordinate.radius.tl, rectCoordinate.y);
  ctx.lineTo(rectCoordinate.tr.x, rectCoordinate.tr.y);
  if (rectCoordinate.tr.qct) {
    ctx.quadraticCurveTo(
      rectCoordinate.tr.qct.cpx,
      rectCoordinate.tr.qct.cpy,
      rectCoordinate.tr.qct.x,
      rectCoordinate.tr.qct.y
    );
  }
  ctx.lineTo(rectCoordinate.br.x, rectCoordinate.br.y);
  if (rectCoordinate.br.qct) {
    ctx.quadraticCurveTo(
      rectCoordinate.br.qct.cpx,
      rectCoordinate.br.qct.cpy,
      rectCoordinate.br.qct.x,
      rectCoordinate.br.qct.y
    );
  }
  ctx.lineTo(rectCoordinate.bl.x, rectCoordinate.bl.y);
  if (rectCoordinate.bl.qct) {
    ctx.quadraticCurveTo(
      rectCoordinate.bl.qct.cpx,
      rectCoordinate.bl.qct.cpy,
      rectCoordinate.bl.qct.x,
      rectCoordinate.bl.qct.y
    );
  }
  ctx.lineTo(rectCoordinate.tl.x, rectCoordinate.tl.y);
  if (rectCoordinate.tl.qct) {
    ctx.quadraticCurveTo(
      rectCoordinate.tl.qct.cpx,
      rectCoordinate.tl.qct.cpy,
      rectCoordinate.tl.qct.x,
      rectCoordinate.tl.qct.y
    );
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
export const getOutsideRectCoordinates = (
  ceil: number,
  contextWidth: number,
  rectTopLeftX: number,
  rectTopLeftY: number,
  rectTopRightX: number,
  rectTopRightY: number,
  rectBottomLeftY: number,
  rectWidth: number,
  rectHeight: number
): ICoordinate => {
  let rectRadius: ICoordinate = {
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
export const clipRect = (ctx: any, coordinates: ICoordinate, color: any) => {
  ctx.beginPath();
  ctx.fillStyle = color;

  // Top area
  ctx.fillRect(coordinates.top.x, coordinates.top.y, coordinates.top.width, coordinates.top.height);

  // Bottom side
  ctx.fillRect(
    coordinates.bottom.x,
    coordinates.bottom.y,
    coordinates.bottom.width,
    coordinates.bottom.height
  );

  // Left area
  ctx.fillRect(
    coordinates.left.x,
    coordinates.left.y,
    coordinates.left.width,
    coordinates.left.height
  );

  // Right area
  ctx.fillRect(
    coordinates.right.x,
    coordinates.right.y,
    coordinates.right.width,
    coordinates.right.height
  );

  ctx.fill();
  ctx.closePath();
};

export const getColor = (imageData: any, x: number, y: number, width: number): string => {
  const index = (x + y * width) * 4;
  const r = imageData.data[index + 0];
  const g = imageData.data[index + 1];
  const b = imageData.data[index + 2];
  const a = imageData.data[index + 3];
  return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
};

export const cropImage = (ctx: any, x: number, y: number, w: number, h: number, scale?: number) => {
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
  let i, j, it, jt;
  scale = scale || 1;
  let canvas = document.createElement('canvas');
  canvas.width = w * scale;
  canvas.height = h * scale;
  let context = canvas.getContext('2d');
  if (context) {
    let sourceData = ctx.getImageData(x, y, w, h);
    context.beginPath();
    for (i = 0; i < w; i++) {
      it = i * scale;
      for (j = 0; j < h; j++) {
        jt = j * scale;
        let color = getColor(sourceData, i, j, w);
        context.fillStyle = color;
        context.fillRect(it, jt, scale, scale);
      }
    }
  }
  return canvas;
};

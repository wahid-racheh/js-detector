export interface IImage {
    width: number;
    height: number;
    data: any[];
}
export interface IBlurStack {
    color: number;
    next: any;
}
export interface IPoint {
    x: number;
    y: number;
    width?: number;
    height?: number;
    qct?: {
        cpx: number;
        cpy: number;
        x: number;
        y: number;
    };
}
export interface IRect {
    width?: number;
    height?: number;
    x: number;
    y: number;
    tl: IPoint;
    tr: IPoint;
    bl: IPoint;
    br: IPoint;
    radius?: any;
}
export interface ICoordinate {
    top: IPoint;
    left: IPoint;
    right: IPoint;
    bottom: IPoint;
}
export interface IRatio {
    w: number;
    h: number;
}
export interface IVideoInput {
    id: string;
    label: string;
}
export interface IDetector {
    ceil?: number;
    width?: number;
    height?: number;
    lineWidth?: number;
    dpi?: number;
    rectBorderDefaultColor?: string;
    rectBorderColorSuccess?: string;
    rectBorderColorError?: string;
    outsideBackgroundColor?: string;
    drawContour?: boolean;
    isImageCaptured?: boolean;
    mimeType?: string;
    imageExtension?: string;
    originalCanvas?: any;
    cropContainer?: any;
    outsideRectCoordinates?: any;
    imageData?: any;
    strokeColor?: string;
    currentStream?: any;
    videoInputList?: Array<IVideoInput>[];
    cameraRequestAnimationFrame?: any;
    roundRectX?: number;
    roundRectY?: number;
    roundRectWidth?: number;
    roundRectHeight?: number;
    ratio?: IRatio;
    formattedRatio?: IRatio;
}

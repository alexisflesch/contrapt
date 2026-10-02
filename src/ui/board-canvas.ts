import type { BoardCanvasContext } from '../presentation/board-renderer';
import {
  createImageBitmapSpriteDecoder,
  type DecodedSprite,
  type SpriteDecoder,
} from '../presentation/sprite-loader';

/**
 * The browser side of the board renderer's ports (ADR 0006): sprites decoded to
 * `ImageBitmap`s and a real Canvas 2D context behind `BoardCanvasContext`. The
 * board and the level previews (V5) draw through the same adapter.
 */

const isImageBitmapSource = (source: unknown): source is ImageBitmap =>
  typeof ImageBitmap !== 'undefined' && source instanceof ImageBitmap;

export const createCanvasSpriteDecoder = (): SpriteDecoder | null => {
  if (typeof fetch !== 'function' || typeof globalThis.createImageBitmap !== 'function') {
    return null;
  }

  const decode = createImageBitmapSpriteDecoder<Blob, ImageBitmap>({
    fetchAsset: (path) => fetch(path),
    createImageBitmap: async (blob) => {
      const source = await globalThis.createImageBitmap(blob);
      return { width: source.width, height: source.height, source };
    },
  });

  return async (path: string): Promise<DecodedSprite> => {
    const sprite = await decode(path);
    if (!isImageBitmapSource(sprite.source)) {
      throw new Error(`Le sprite « ${path} » n'est pas un bitmap exploitable.`);
    }

    return {
      width: sprite.width,
      height: sprite.height,
      source: sprite.source,
    };
  };
};

export const createCanvasContextAdapter = (
  context: CanvasRenderingContext2D,
): BoardCanvasContext => ({
  save: () => {
    context.save();
  },
  restore: () => {
    context.restore();
  },
  setTransform: (horizontalScale, verticalSkew, horizontalSkew, verticalScale, x, y) => {
    context.setTransform(horizontalScale, verticalSkew, horizontalSkew, verticalScale, x, y);
  },
  translate: (x, y) => {
    context.translate(x, y);
  },
  rotate: (radians) => {
    context.rotate(radians);
  },
  scale: (x, y) => {
    context.scale(x, y);
  },
  drawImage: (source, x, y, width, height) => {
    if (!isImageBitmapSource(source)) {
      throw new Error('Le renderer a reçu une source de sprite non exploitable.');
    }

    context.drawImage(source, x, y, width, height);
  },
  drawImageRegion: (source, sx, sy, sw, sh, x, y, width, height) => {
    if (!isImageBitmapSource(source)) {
      throw new Error('Le renderer a reçu une source de sprite non exploitable.');
    }

    context.drawImage(source, sx, sy, sw, sh, x, y, width, height);
  },
  beginPath: () => {
    context.beginPath();
  },
  moveTo: (x, y) => {
    context.moveTo(x, y);
  },
  lineTo: (x, y) => {
    context.lineTo(x, y);
  },
  arc: (x, y, radius, startAngle, endAngle) => {
    context.arc(x, y, radius, startAngle, endAngle);
  },
  ellipse: (x, y, radiusX, radiusY, rotation, startAngle, endAngle) => {
    context.ellipse(x, y, radiusX, radiusY, rotation, startAngle, endAngle);
  },
  createRadialGradient: (startX, startY, startRadius, endX, endY, endRadius) =>
    context.createRadialGradient(startX, startY, startRadius, endX, endY, endRadius),
  stroke: () => {
    context.stroke();
  },
  fill: () => {
    context.fill();
  },
  fillText: (text, x, y) => {
    context.fillText(text, x, y);
  },
  get globalAlpha() {
    return context.globalAlpha;
  },
  set globalAlpha(value: number) {
    context.globalAlpha = value;
  },
  get strokeStyle() {
    return typeof context.strokeStyle === 'string' ? context.strokeStyle : '';
  },
  set strokeStyle(value: string) {
    context.strokeStyle = value;
  },
  get fillStyle() {
    return typeof context.fillStyle === 'string' ? context.fillStyle : '';
  },
  set fillStyle(value: string | CanvasGradient) {
    context.fillStyle = value;
  },
  get lineCap() {
    return context.lineCap;
  },
  set lineCap(value: CanvasLineCap) {
    context.lineCap = value;
  },
  get font() {
    return context.font;
  },
  set font(value: string) {
    context.font = value;
  },
  get textAlign() {
    return context.textAlign;
  },
  set textAlign(value: CanvasTextAlign) {
    context.textAlign = value;
  },
  get textBaseline() {
    return context.textBaseline;
  },
  set textBaseline(value: CanvasTextBaseline) {
    context.textBaseline = value;
  },
  strokeRect: (x, y, width, height) => {
    context.strokeRect(x, y, width, height);
  },
  setLineDash: (segments) => {
    context.setLineDash([...segments]);
  },
  fillRect: (x, y, width, height) => {
    context.fillRect(x, y, width, height);
  },
  get lineWidth() {
    return context.lineWidth;
  },
  set lineWidth(value: number) {
    context.lineWidth = value;
  },
});

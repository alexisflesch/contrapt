import type { Locator } from '@playwright/test';

export type Rgba = readonly [number, number, number, number];

/**
 * V2b: the board is a plain parchment (`#f6ead3`) with a one-metre world grid
 * over the whole viewport, and no image. This repaints exactly that, for the
 * canvas's current camera, off screen, and returns the pixel at `point` (CSS
 * pixels from the canvas's top-left corner): what an empty spot should show.
 */
export const expectedPaperPixel = (
  canvas: Locator,
  point: { x: number; y: number },
): Promise<Rgba> =>
  canvas.evaluate((element, local): Rgba => {
    if (!(element instanceof HTMLCanvasElement)) return [0, 0, 0, 0];
    const [ox, oy] = (element.dataset.cameraOrigin ?? '').split(',').map(Number);
    const zoom = Number(element.dataset.cameraZoom);
    if (ox === undefined || oy === undefined || !(zoom > 0)) return [0, 0, 0, 0];
    const expected = document.createElement('canvas');
    expected.width = element.width;
    expected.height = element.height;
    const context = expected.getContext('2d');
    if (context === null) return [0, 0, 0, 0];
    const { width, height } = element.getBoundingClientRect();
    const scale = element.width / width;
    context.setTransform(scale, 0, 0, scale, 0, 0);
    context.fillStyle = '#f6ead3';
    context.fillRect(0, 0, width, height);
    context.lineWidth = 1;
    context.strokeStyle = `rgba(78, 68, 51, ${String(0.16 * Math.min(1, zoom / 64))})`;
    context.beginPath();
    for (let x = Math.ceil(ox); x < ox + width / zoom; x += 1) {
      context.moveTo((x - ox) * zoom, 0);
      context.lineTo((x - ox) * zoom, height);
    }
    for (let y = Math.ceil(oy); y < oy + height / zoom; y += 1) {
      context.moveTo(0, (y - oy) * zoom);
      context.lineTo(width, (y - oy) * zoom);
    }
    context.stroke();
    const data = context.getImageData(
      Math.round(local.x * scale),
      Math.round(local.y * scale),
      1,
      1,
    ).data;
    return [data[0] ?? 0, data[1] ?? 0, data[2] ?? 0, data[3] ?? 0];
  }, point);

/** The canvas's own pixel at `point` (CSS pixels from its top-left corner), or `null` off canvas. */
export const canvasPixelAt = (
  canvas: Locator,
  point: { x: number; y: number },
): Promise<Rgba | null> =>
  canvas.evaluate((element, local): Rgba | null => {
    if (!(element instanceof HTMLCanvasElement)) return null;
    const context = element.getContext('2d');
    if (context === null) return null;
    const { width, height } = element.getBoundingClientRect();
    if (local.x < 0 || local.y < 0 || local.x >= width || local.y >= height) return null;
    const scale = element.width / width;
    const data = context.getImageData(
      Math.round(local.x * scale),
      Math.round(local.y * scale),
      1,
      1,
    ).data;
    return [data[0] ?? 0, data[1] ?? 0, data[2] ?? 0, data[3] ?? 0];
  }, point);

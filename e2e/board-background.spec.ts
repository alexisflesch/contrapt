import { mkdir } from 'node:fs/promises';

import { expect, test, type Locator, type Page } from '@playwright/test';

import { levelDocumentSchema } from '../src/domain/level-document';
import { encodeShareFragment } from '../src/infrastructure/level-share/level-share-codec';

const formats = [
  { width: 390, height: 844 },
  { width: 844, height: 390 },
  { width: 1440, height: 900 },
] as const;

const level = levelDocumentSchema.parse({
  schemaVersion: 2,
  id: 'u2-background',
  metadata: { title: 'Le fond suit la caméra' },
  scene: { min: { x: 0, y: 0 }, max: { x: 8, y: 5.5 } },
  objects: [
    {
      id: 'ball',
      type: 'ball',
      props: {},
      transform: { position: { x: 0.6, y: 0.6 }, rotation: 0 },
      permissions: { move: false, rotate: false, remove: false },
    },
    {
      id: 'basket',
      type: 'basket',
      props: {},
      transform: { position: { x: 7.1, y: 4.7 }, rotation: 0 },
      permissions: { move: false, rotate: false, remove: false },
    },
  ],
  inventory: [],
  buildZones: [],
  goal: { type: 'basket', ballId: 'ball', basketId: 'basket' },
});

/** Compares real pixels with the existing image projected in the scene, at empty off-grid points. */
const backgroundMatchesCamera = (canvas: Locator): Promise<boolean> =>
  canvas.evaluate(async (element) => {
    if (!(element instanceof HTMLCanvasElement)) return false;
    const actual = element.getContext('2d');
    if (actual === null) return false;
    const [ox, oy] = (element.dataset.cameraOrigin ?? '').split(',').map(Number);
    const zoom = Number(element.dataset.cameraZoom);
    if (ox === undefined || oy === undefined || !(zoom > 0)) return false;
    const image = new Image();
    image.src = '/assets/backgrounds/board-generic-v0.png';
    await image.decode();
    const expected = document.createElement('canvas');
    expected.width = element.width;
    expected.height = element.height;
    const context = expected.getContext('2d');
    if (context === null) return false;
    const bounds = element.getBoundingClientRect();
    const dpr = element.width / bounds.width;
    context.setTransform(dpr, 0, 0, element.height / bounds.height, 0, 0);
    context.fillStyle = '#d9d2c7';
    context.fillRect(0, 0, bounds.width, bounds.height);
    context.drawImage(image, -ox * zoom, -oy * zoom, 8 * zoom, 5.5 * zoom);
    const points = [
      { x: 3.3, y: 2.3 },
      { x: 4.6, y: 3.4 },
    ];
    for (const point of points) {
      const x = Math.round((point.x - ox) * zoom * dpr);
      const y = Math.round((point.y - oy) * zoom * dpr);
      if (x < 0 || y < 0 || x >= element.width || y >= element.height) return false;
      const a = actual.getImageData(x, y, 1, 1).data;
      const b = context.getImageData(x, y, 1, 1).data;
      if (![0, 1, 2, 3].every((channel) => Math.abs((a[channel] ?? 0) - (b[channel] ?? 0)) <= 3))
        return false;
    }
    // The top-left corner is outside the scene after fitting: it is opaque and neutral.
    if (ox < 0 && oy < 0) {
      const pixel = actual.getImageData(2, 2, 1, 1).data;
      if (Array.from(pixel).join(',') !== '217,210,199,255') return false;
    }
    return true;
  });

const pan = async (page: Page, canvas: Locator) => {
  const bounds = await canvas.boundingBox();
  if (bounds === null) throw new Error('Plateau absent.');
  const touch = await page.context().newCDPSession(page);
  const x = bounds.x + bounds.width / 2;
  const y = bounds.y + bounds.height / 2;
  try {
    await touch.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ id: 1, x, y }],
    });
    for (let step = 1; step <= 6; step += 1) {
      await touch.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [{ id: 1, x: x + step * 6, y: y + step * 3 }],
      });
    }
  } finally {
    await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await touch.detach();
  }
};

for (const viewport of formats) {
  test(`U2 — fond projeté, grille et panoramique tactile à ${String(viewport.width)} × ${String(viewport.height)}`, async ({
    page,
  }) => {
    await mkdir('test-results/board-background', { recursive: true });
    await page.setViewportSize(viewport);
    await page.goto(`/shared${await encodeShareFragment(level)}`);
    const board = page.getByRole('region', { name: 'Plateau de jeu' });
    const canvas = board.getByRole('img', { name: 'Rendu du plateau' });
    await expect(canvas).toBeVisible();
    await expect(board).toHaveCSS('background-image', 'none');
    await expect.poll(() => backgroundMatchesCamera(canvas)).toBe(true);
    const size = `${String(viewport.width)}x${String(viewport.height)}`;
    const shot = (name: string) =>
      page.screenshot({
        path: `test-results/board-background/${name}-${size}.png`,
        fullPage: true,
        scale: 'css',
      });
    await shot('ajuste');
    const zoom = Number(await canvas.getAttribute('data-camera-zoom'));
    await page.getByRole('button', { name: 'Zoom avant', exact: true }).tap();
    await expect
      .poll(async () => Number(await canvas.getAttribute('data-camera-zoom')))
      .toBeGreaterThan(zoom);
    await expect.poll(() => backgroundMatchesCamera(canvas)).toBe(true);
    await shot('zoom');
    const origin = await canvas.getAttribute('data-camera-origin');
    await pan(page, canvas);
    await expect(canvas).not.toHaveAttribute('data-camera-origin', origin ?? '');
    await expect.poll(() => backgroundMatchesCamera(canvas)).toBe(true);
    await shot('panoramique');
    await page.getByRole('button', { name: 'Ajuster à la scène', exact: true }).tap();
    await expect
      .poll(async () => Number(await canvas.getAttribute('data-camera-zoom')))
      .toBeCloseTo(zoom);
    await expect.poll(() => backgroundMatchesCamera(canvas)).toBe(true);
  });
}

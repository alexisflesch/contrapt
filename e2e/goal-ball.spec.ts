import { mkdir } from 'node:fs/promises';

import { expect, test, type Locator, type Page } from '@playwright/test';

import { levelDocumentSchema } from '../src/domain/level-document';
import { encodeShareFragment } from '../src/infrastructure/level-share/level-share-codec';

const formats = [
  { width: 390, height: 844 },
  { width: 844, height: 390 },
  { width: 1440, height: 900 },
] as const;

type Point = { readonly x: number; readonly y: number };
type Rgba = readonly [number, number, number, number];

const locked = { move: false, rotate: false, remove: false } as const;
const placed = (id: string, type: string, x: number, y: number) => ({
  id,
  type,
  props: {},
  transform: { position: { x, y }, rotation: 0 },
  permissions: locked,
});

const goalBall = { x: 1.5, y: 1 } as const;
const blueBall = { x: 4.5, y: 1 } as const;

/** The goal's ball and a second ball, side by side, both free to fall once launched. */
const twoBallLevel = levelDocumentSchema.parse({
  schemaVersion: 2,
  id: 'u7-goal-ball',
  metadata: { title: 'Balle suivie' },
  objects: [
    placed('ball-1', 'ball', goalBall.x, goalBall.y),
    placed('ball-2', 'ball', blueBall.x, blueBall.y),
    placed('basket-1', 'basket', 7.1, 4.7),
  ],
  inventory: [],
  goal: { type: 'basket', ballId: 'ball-1', basketId: 'basket-1' },
  buildZones: [{ min: { x: 0, y: 0 }, max: { x: 8, y: 5.5 } }],
  scene: { min: { x: 0, y: 0 }, max: { x: 8, y: 5.5 } },
  wires: [],
});

/** Ball radius (0,3 unit) plus the ring's fixed gap, as the renderer draws it. */
const ringRadius = (zoom: number): number => 0.3 * zoom + 5;

const camera = async (canvas: Locator) => {
  const [x, y] = ((await canvas.getAttribute('data-camera-origin')) ?? '').split(',').map(Number);
  const zoom = Number(await canvas.getAttribute('data-camera-zoom'));
  if (x === undefined || y === undefined || !(zoom > 0)) {
    throw new Error('Le repère caméra doit être disponible pour viser une coordonnée monde.');
  }
  return { origin: { x, y }, zoom };
};

/** The canvas's colour on the ring's right edge around a world point. */
const ringPixel = async (canvas: Locator, centre: Point): Promise<Rgba> => {
  const { origin, zoom } = await camera(canvas);
  const local = {
    x: (centre.x - origin.x) * zoom + ringRadius(zoom),
    y: (centre.y - origin.y) * zoom,
  };
  return canvas.evaluate((element, point): Rgba => {
    if (!(element instanceof HTMLCanvasElement)) return [0, 0, 0, 0];
    const context = element.getContext('2d');
    if (context === null) return [0, 0, 0, 0];
    const scale = element.width / element.getBoundingClientRect().width;
    const data = context.getImageData(
      Math.round(point.x * scale),
      Math.round(point.y * scale),
      1,
      1,
    ).data;
    return [data[0] ?? 0, data[1] ?? 0, data[2] ?? 0, data[3] ?? 0];
  }, local);
};

const isRingRed = ([red, green, blue, alpha]: Rgba): boolean =>
  alpha > 200 && red > 150 && red - green > 80 && red - blue > 80;

const openLevel = async (page: Page): Promise<Locator> => {
  await page.goto(`/shared${await encodeShareFragment(twoBallLevel)}`);
  await expect(page.getByText('Partage · Balle suivie')).toBeVisible();
  const canvas = page
    .getByRole('region', { name: 'Plateau de jeu' })
    .getByRole('img', { name: 'Rendu du plateau' });
  await expect(canvas).toBeVisible();
  // The renderer draws nothing before every sprite is decoded.
  await expect.poll(async () => isRingRed(await ringPixel(canvas, goalBall))).toBe(true);
  return canvas;
};

/** Launches the machine and pauses it once both balls have fallen a little. */
const launchAndPause = async (page: Page, canvas: Locator): Promise<Point> => {
  await page.getByRole('button', { name: 'Lancer' }).click();
  await expect
    .poll(async () => Number((await canvas.getAttribute('data-simulation-step')) ?? '0'))
    .toBeGreaterThan(15);
  await page.getByRole('button', { name: 'Mettre en pause' }).click();
  await expect(page.getByText('Simulation en pause')).toBeVisible();
  const [x, y] = ((await canvas.getAttribute('data-simulation-ball-position')) ?? '')
    .split(',')
    .map(Number);
  if (x === undefined || y === undefined || Number.isNaN(x) || Number.isNaN(y)) {
    throw new Error('La position simulée de la balle doit être exposée.');
  }
  return { x, y };
};

test('U7 — la balle de l’objectif est cerclée, la bleue non, et l’anneau suit la balle en simulation', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'Le parcours est validé sur mobile.');
  await page.setViewportSize({ width: 390, height: 844 });
  const canvas = await openLevel(page);

  await expect(canvas).toHaveAttribute('data-goal-ball-marker', 'ball-1');
  await expect(canvas).toHaveAttribute('data-red-balls', 'ball-1');
  await expect(canvas).toHaveAttribute('data-blue-balls', 'ball-2');
  // Same spot beside the blue ball: nothing drawn, the ring is the goal's alone.
  expect((await ringPixel(canvas, blueBall))[3]).toBe(0);

  const paused = await launchAndPause(page, canvas);
  expect(paused.y).toBeGreaterThan(goalBall.y + 0.1);
  await expect(canvas).toHaveAttribute('data-goal-ball-marker', 'ball-1');
  await expect.poll(async () => isRingRed(await ringPixel(canvas, paused))).toBe(true);
  // Where the ball started, the ring is gone: it moved with the ball.
  expect(isRingRed(await ringPixel(canvas, goalBall))).toBe(false);

  // The objective says it in words too.
  await page.getByRole('button', { name: 'Voir l’objectif' }).click();
  await expect(page.getByRole('dialog', { name: 'Objectif du niveau' })).toContainText(
    'Seule la balle rouge compte : sur le plateau, elle est entourée d’un anneau.',
  );
});

test('U7 — captures de la balle cerclée, au repos et en simulation, aux trois formats', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'Les captures sont prises sur le profil mobile.');
  await mkdir('test-results/goal-ball', { recursive: true });

  for (const viewport of formats) {
    const size = `${String(viewport.width)}x${String(viewport.height)}`;
    const shot = (name: string) =>
      page.screenshot({
        path: `test-results/goal-ball/${name}-${size}.png`,
        fullPage: true,
        scale: 'css',
      });
    await page.setViewportSize(viewport);
    // Same URL, same hash: leave first, or the app would keep its state.
    await page.goto('about:blank');
    const canvas = await openLevel(page);
    await page.waitForTimeout(200);
    await shot('repos');

    const paused = await launchAndPause(page, canvas);
    await expect.poll(async () => isRingRed(await ringPixel(canvas, paused))).toBe(true);
    await shot('simulation');
  }
});

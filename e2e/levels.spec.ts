import { expect, test, type Page } from '@playwright/test';

import { ROTATION_HANDLE_DISTANCE_CSS_PIXELS } from '../src/presentation/rotation-handle-metrics';

const levelOnePath = '/levels/level-1-prolonger-la-pente/play';
const levelTwoPath = '/levels/level-2-le-pont/play';
const levelThreePath = '/levels/level-3-incliner/play';
const levelFourPath = '/levels/level-4-moins-c-est-mieux/play';
const levelFivePath = '/levels/level-5-le-detour/play';
const levelSixPath = '/levels/level-6-la-bascule/play';
const levelSevenPath = '/levels/level-7-placer-la-bascule/play';
const levelEightPath = '/levels/level-8-poutre-et-bascule/play';
const levelNinePath = '/levels/level-9-le-tapis/play';

interface WorldPoint {
  readonly x: number;
  readonly y: number;
}

interface ScreenPoint {
  readonly x: number;
  readonly y: number;
}

const screenPointForWorld = async (page: Page, point: WorldPoint): Promise<ScreenPoint | null> => {
  const canvas = page.getByRole('img', { name: 'Rendu du plateau' });
  const bounds = await canvas.boundingBox();
  const rawOrigin = await canvas.getAttribute('data-camera-origin');
  const zoom = Number(await canvas.getAttribute('data-camera-zoom'));
  expect(bounds).not.toBeNull();
  expect(rawOrigin).not.toBeNull();
  expect(Number.isFinite(zoom) && zoom > 0).toBe(true);
  if (bounds === null || rawOrigin === null || !Number.isFinite(zoom) || zoom <= 0) return null;

  const [originX, originY] = rawOrigin.split(',').map(Number);
  expect(Number.isFinite(originX) && Number.isFinite(originY)).toBe(true);
  if (
    originX === undefined ||
    originY === undefined ||
    !Number.isFinite(originX) ||
    !Number.isFinite(originY)
  ) {
    return null;
  }

  return {
    x: bounds.x + (point.x - originX) * zoom,
    y: bounds.y + (point.y - originY) * zoom,
  };
};

const tapWorldPoint = async (page: Page, point: WorldPoint): Promise<void> => {
  const screenPoint = await screenPointForWorld(page, point);
  expect(screenPoint).not.toBeNull();
  if (screenPoint === null) return;
  await page.touchscreen.tap(screenPoint.x, screenPoint.y);
};

const dragScreenPoints = async (
  page: Page,
  start: ScreenPoint,
  target: ScreenPoint,
): Promise<void> => {
  // The mobile project uses Chromium: CDP dispatches touch input, so this
  // exercises the same pointer type the player uses instead of a mouse drag.
  const touchSession = await page.context().newCDPSession(page);
  let touchStarted = false;
  try {
    await touchSession.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [
        {
          id: 1,
          x: start.x,
          y: start.y,
          radiusX: 1,
          radiusY: 1,
          force: 1,
        },
      ],
    });
    touchStarted = true;

    for (let step = 1; step <= 8; step += 1) {
      const progress = step / 8;
      await touchSession.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [
          {
            id: 1,
            x: start.x + (target.x - start.x) * progress,
            y: start.y + (target.y - start.y) * progress,
            radiusX: 1,
            radiusY: 1,
            force: 1,
          },
        ],
      });
    }
  } finally {
    if (touchStarted) {
      await touchSession.send('Input.dispatchTouchEvent', {
        type: 'touchEnd',
        touchPoints: [],
      });
    }
    await touchSession.detach();
  }
};

const dragWorldPoints = async (
  page: Page,
  start: WorldPoint,
  target: WorldPoint,
): Promise<void> => {
  const startOnScreen = await screenPointForWorld(page, start);
  const targetOnScreen = await screenPointForWorld(page, target);
  expect(startOnScreen).not.toBeNull();
  expect(targetOnScreen).not.toBeNull();
  if (startOnScreen === null || targetOnScreen === null) return;
  await dragScreenPoints(page, startOnScreen, targetOnScreen);
};

test('niveau 3 : poser puis tourner la poutre de référence avec la poignée au tactile', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'La résolution au toucher est testée sur mobile.');
  await page.goto(levelThreePath);

  await expect(page.getByText('Niveau 3 · Incliner')).toBeVisible();
  await expect(page.getByText('Mode joueur')).toBeVisible();
  const board = page.getByRole('region', { name: 'Plateau de jeu' });
  const canvas = board.getByRole('img', { name: 'Rendu du plateau' });
  await expect(board).toBeVisible();

  await page.getByRole('button', { name: 'Ouvrir le catalogue' }).tap();
  const drawer = page.getByRole('region', { name: 'Objets disponibles' });
  await expect(drawer.locator('.object-count')).toHaveText('1 entrée');
  await expect(drawer.locator('.object-card')).toHaveCount(1);
  await expect(drawer.getByText('Quantité : 1')).toBeVisible();
  await expect(drawer.getByRole('button', { name: 'Balle' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Poutre moyenne' }).tap();
  await tapWorldPoint(page, { x: 3.2, y: 2.5 });
  const closeProperties = page.getByRole('button', { name: 'Fermer les propriétés' });
  await expect(closeProperties).toBeVisible();
  await closeProperties.tap();

  const cameraOriginBefore = await canvas.getAttribute('data-camera-origin');
  expect(cameraOriginBefore).not.toBeNull();
  const beforeRotation = await canvas.screenshot();
  const center = await screenPointForWorld(page, { x: 3.2, y: 2.5 });
  expect(center).not.toBeNull();
  if (center === null) return;

  const handleRadius = ROTATION_HANDLE_DISTANCE_CSS_PIXELS;
  const targetAngle = Math.PI / 12;
  await dragScreenPoints(
    page,
    { x: center.x, y: center.y - handleRadius },
    {
      x: center.x + handleRadius * Math.sin(targetAngle),
      y: center.y - handleRadius * Math.cos(targetAngle),
    },
  );
  await expect
    .poll(async () => !(await canvas.screenshot()).equals(beforeRotation), { timeout: 2_000 })
    .toBe(true);
  await expect(canvas).toHaveAttribute('data-camera-origin', cameraOriginBefore ?? '');

  await page.getByRole('button', { name: 'Tester' }).tap();
  const victoryResult = page.getByRole('region', { name: 'Résultat du niveau' });
  await expect(victoryResult).toBeVisible({ timeout: 15_000 });
  await expect(victoryResult.getByText('Victoire')).toBeVisible();
});

test('niveau 4 : choisir la poutre longue et gagner au tactile', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'La résolution au toucher est testée sur mobile.');
  await page.goto(levelFourPath);

  await expect(page.getByText('Niveau 4 · Moins, c’est mieux')).toBeVisible();
  const board = page.getByRole('region', { name: 'Plateau de jeu' });
  const canvas = board.getByRole('img', { name: 'Rendu du plateau' });
  await expect(board).toBeVisible();
  await page.getByRole('button', { name: 'Ouvrir le catalogue' }).tap();

  const drawer = page.getByRole('region', { name: 'Objets disponibles' });
  await expect(drawer.locator('.object-card')).toHaveCount(2);
  await expect(drawer.getByRole('button', { name: 'Poutre courte, quantité : 2' })).toBeVisible();
  await expect(drawer.getByRole('button', { name: 'Poutre longue, quantité : 1' })).toBeVisible();

  await drawer.getByRole('button', { name: 'Poutre longue, quantité : 1' }).tap();
  // Place inside the zone, leaving room for touch-coordinate rounding at its edge.
  await tapWorldPoint(page, { x: 3.3, y: 2.2 });
  await page.getByRole('button', { name: 'Fermer les propriétés' }).tap();
  const beforeRotation = await canvas.screenshot();
  const center = await screenPointForWorld(page, { x: 3.3, y: 2.2 });
  expect(center).not.toBeNull();
  if (center === null) return;

  const handleRadius = ROTATION_HANDLE_DISTANCE_CSS_PIXELS;
  const targetAngle = Math.PI / 12;
  await dragScreenPoints(
    page,
    { x: center.x, y: center.y - handleRadius },
    {
      x: center.x + handleRadius * Math.sin(targetAngle),
      y: center.y - handleRadius * Math.cos(targetAngle),
    },
  );
  await expect
    .poll(async () => !(await canvas.screenshot()).equals(beforeRotation), { timeout: 2_000 })
    .toBe(true);
  await page.getByRole('button', { name: 'Tester' }).tap();

  const result = page.getByRole('region', { name: 'Résultat du niveau' });
  await expect(result).toBeVisible({ timeout: 15_000 });
  await expect(result.getByText('Victoire')).toBeVisible();
});

test('niveau 5 : détourner la balle avec deux poutres tournées au tactile', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'La résolution au toucher est testée sur mobile.');
  await page.goto(levelFivePath);

  await expect(page.getByText('Niveau 5 · Le détour')).toBeVisible();
  const board = page.getByRole('region', { name: 'Plateau de jeu' });
  const canvas = board.getByRole('img', { name: 'Rendu du plateau' });
  await expect(board).toBeVisible();

  const drawer = page.getByRole('region', { name: 'Objets disponibles' });
  await page.getByRole('button', { name: 'Ouvrir le catalogue' }).tap();
  await expect(drawer.locator('.object-card')).toHaveCount(2);
  const shortBeam = drawer.getByRole('button', { name: 'Poutre courte, quantité : 1' });
  const mediumBeam = drawer.getByRole('button', { name: 'Poutre moyenne, quantité : 1' });
  await expect(shortBeam).toBeEnabled();
  await expect(mediumBeam).toBeEnabled();
  await shortBeam.tap();
  await tapWorldPoint(page, { x: 2.3, y: 1.4 });
  await page.getByRole('button', { name: 'Fermer les propriétés' }).tap();

  const rotateAt = async (point: WorldPoint, angleDegrees: number): Promise<void> => {
    const beforeRotation = await canvas.screenshot();
    const center = await screenPointForWorld(page, point);
    expect(center).not.toBeNull();
    if (center === null) return;
    const targetAngle = (angleDegrees * Math.PI) / 180;
    const handleRadius = ROTATION_HANDLE_DISTANCE_CSS_PIXELS;
    await dragScreenPoints(
      page,
      { x: center.x, y: center.y - handleRadius },
      {
        x: center.x + handleRadius * Math.sin(targetAngle),
        y: center.y - handleRadius * Math.cos(targetAngle),
      },
    );
    await expect
      .poll(async () => !(await canvas.screenshot()).equals(beforeRotation), { timeout: 2_000 })
      .toBe(true);
  };

  // Player rotation snaps to 15° increments; this angle is also in the measured window.
  await rotateAt({ x: 2.3, y: 1.4 }, 15);
  await page.getByRole('button', { name: 'Ouvrir le catalogue' }).tap();
  await expect(drawer.getByRole('button', { name: 'Poutre courte, quantité : 0' })).toBeDisabled();
  await expect(mediumBeam).toBeEnabled();
  await mediumBeam.tap();
  await tapWorldPoint(page, { x: 3.8, y: 3.5 });
  await page.getByRole('button', { name: 'Fermer les propriétés' }).tap();
  await rotateAt({ x: 3.8, y: 3.5 }, -15);
  await page.getByRole('button', { name: 'Tester' }).tap();

  const result = page.getByRole('region', { name: 'Résultat du niveau' });
  await expect(result).toBeVisible({ timeout: 15_000 });
  await expect(result.getByText('Victoire')).toBeVisible();
});

test('niveau 6 : lancer l’observation sans poser d’objet et voir la balle gagner', async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== 'mobile',
    'La résolution sans action est vérifiée sur mobile.',
  );
  await page.goto(levelSixPath);

  await expect(page.getByText('Niveau 6 · La bascule')).toBeVisible();
  await expect(page.getByRole('region', { name: 'Objets disponibles' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Tester' }).tap();
  const result = page.getByRole('region', { name: 'Résultat du niveau' });
  await expect(result).toBeVisible({ timeout: 15_000 });
  await expect(result.getByText('Victoire')).toBeVisible();
});

test('niveau 7 : poser la bascule au tactile et voir la balle gagner', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'La résolution au toucher est testée sur mobile.');
  await page.goto(levelSevenPath);

  await expect(page.getByText('Niveau 7 · Placer la bascule')).toBeVisible();
  const board = page.getByRole('region', { name: 'Plateau de jeu' });
  await expect(board).toBeVisible();
  await page.getByRole('button', { name: 'Ouvrir le catalogue' }).tap();

  const drawer = page.getByRole('region', { name: 'Objets disponibles' });
  await expect(drawer.locator('.object-card')).toHaveCount(1);
  await expect(drawer.getByRole('button', { name: 'Bascule, quantité : 1' })).toBeVisible();
  await expect(drawer.getByRole('button', { name: 'Balle' })).toHaveCount(0);
  await drawer.getByRole('button', { name: 'Bascule, quantité : 1' }).tap();
  await tapWorldPoint(page, { x: 2.5, y: 3.2 });
  await page.getByRole('button', { name: 'Fermer les propriétés' }).tap();
  await page.getByRole('button', { name: 'Tester' }).tap();

  const result = page.getByRole('region', { name: 'Résultat du niveau' });
  await expect(result).toBeVisible({ timeout: 15_000 });
  await expect(result.getByText('Victoire')).toBeVisible();
});

test('niveau 8 : enchaîner poutre et bascule au tactile', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'La résolution au toucher est testée sur mobile.');
  await page.goto(levelEightPath);

  await expect(page.getByText('Niveau 8 · Poutre et bascule')).toBeVisible();
  const board = page.getByRole('region', { name: 'Plateau de jeu' });
  const canvas = board.getByRole('img', { name: 'Rendu du plateau' });
  await expect(board).toBeVisible();
  await page.getByRole('button', { name: 'Ouvrir le catalogue' }).tap();

  const drawer = page.getByRole('region', { name: 'Objets disponibles' });
  await expect(drawer.locator('.object-card')).toHaveCount(2);
  await drawer.getByRole('button', { name: 'Poutre moyenne, quantité : 1' }).tap();
  await tapWorldPoint(page, { x: 2.3, y: 1.5 });
  await page.getByRole('button', { name: 'Fermer les propriétés' }).tap();

  const beamCenter = await screenPointForWorld(page, { x: 2.3, y: 1.5 });
  expect(beamCenter).not.toBeNull();
  if (beamCenter === null) return;
  const beforeRotation = await canvas.screenshot();
  const handleRadius = ROTATION_HANDLE_DISTANCE_CSS_PIXELS;
  const targetAngle = Math.PI / 12;
  await dragScreenPoints(
    page,
    { x: beamCenter.x, y: beamCenter.y - handleRadius },
    {
      x: beamCenter.x + handleRadius * Math.sin(targetAngle),
      y: beamCenter.y - handleRadius * Math.cos(targetAngle),
    },
  );
  await expect
    .poll(async () => !(await canvas.screenshot()).equals(beforeRotation), { timeout: 2_000 })
    .toBe(true);

  await page.getByRole('button', { name: 'Ouvrir le catalogue' }).tap();
  await drawer.getByRole('button', { name: 'Bascule, quantité : 1' }).tap();
  await tapWorldPoint(page, { x: 4.0, y: 3.4 });
  await page.getByRole('button', { name: 'Fermer les propriétés' }).tap();
  await page.getByRole('button', { name: 'Tester' }).tap();

  const result = page.getByRole('region', { name: 'Résultat du niveau' });
  await expect(result).toBeVisible({ timeout: 15_000 });
  await expect(result.getByText('Victoire')).toBeVisible();
});

test('niveau 9 : poser le convoyeur et entraîner la balle au tactile', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'La résolution au toucher est testée sur mobile.');
  await page.goto(levelNinePath);

  await expect(page.getByText('Niveau 9 · Le tapis')).toBeVisible();
  const board = page.getByRole('region', { name: 'Plateau de jeu' });
  await expect(board).toBeVisible();
  await page.getByRole('button', { name: 'Ouvrir le catalogue' }).tap();

  const drawer = page.getByRole('region', { name: 'Objets disponibles' });
  await expect(drawer.locator('.object-card')).toHaveCount(1);
  await expect(drawer.getByRole('button', { name: 'Convoyeur, quantité : 1' })).toBeVisible();
  await expect(drawer.getByRole('button', { name: 'Balle' })).toHaveCount(0);
  await drawer.getByRole('button', { name: 'Convoyeur, quantité : 1' }).tap();
  await tapWorldPoint(page, { x: 2.2, y: 2.2 });
  await page.getByRole('button', { name: 'Fermer les propriétés' }).tap();
  await page.getByRole('button', { name: 'Tester' }).tap();

  const result = page.getByRole('region', { name: 'Résultat du niveau' });
  await expect(result).toBeVisible({ timeout: 15_000 });
  await expect(result.getByText('Victoire')).toBeVisible();
});

test('niveau 2 : poser puis glisser la poutre avant de gagner au tactile', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'La résolution au toucher est testée sur mobile.');
  await page.goto(levelTwoPath);

  await expect(page.getByText('Niveau 2 · Le pont')).toBeVisible();
  await expect(page.getByText('Mode joueur')).toBeVisible();
  const board = page.getByRole('region', { name: 'Plateau de jeu' });
  const canvas = board.getByRole('img', { name: 'Rendu du plateau' });
  await expect(board).toBeVisible();

  await page.getByRole('button', { name: 'Ouvrir le catalogue' }).tap();
  await page.getByRole('button', { name: 'Poutre courte' }).tap();
  await tapWorldPoint(page, { x: 2.8, y: 1.95 });
  const closeProperties = page.getByRole('button', { name: 'Fermer les propriétés' });
  await expect(closeProperties).toBeVisible();
  await closeProperties.tap();

  const beforeMove = await canvas.screenshot();
  const cameraOriginBefore = await canvas.getAttribute('data-camera-origin');
  expect(cameraOriginBefore).not.toBeNull();
  await dragWorldPoints(page, { x: 2.8, y: 1.95 }, { x: 3.3, y: 1.95 });
  await expect
    .poll(async () => !(await canvas.screenshot()).equals(beforeMove), { timeout: 2_000 })
    .toBe(true);
  await expect(canvas).toHaveAttribute('data-camera-origin', cameraOriginBefore ?? '');

  await page.getByRole('button', { name: 'Tester' }).tap();
  const victoryResult = page.getByRole('region', { name: 'Résultat du niveau' });
  await expect(victoryResult).toBeVisible({ timeout: 15_000 });
  await expect(victoryResult.getByText('Victoire')).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('niveau 1 : échouer sans poutre puis résoudre par toucher', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'La résolution au toucher est testée sur mobile.');
  await page.goto(levelOnePath);

  await expect(page.getByText('Niveau 1 · Prolonger la pente')).toBeVisible();
  await expect(page.getByText('Mode joueur')).toBeVisible();
  const board = page.getByRole('region', { name: 'Plateau de jeu' });
  const canvas = board.getByRole('img', { name: 'Rendu du plateau' });
  await expect(board).toBeVisible();

  await page.getByRole('button', { name: 'Tester' }).tap();
  const readBallPosition = async (): Promise<WorldPoint | null> => {
    const raw = await canvas.getAttribute('data-simulation-ball-position');
    if (raw === null) return null;
    const [x, y] = raw.split(',').map(Number);
    return x === undefined || y === undefined || !Number.isFinite(x) || !Number.isFinite(y)
      ? null
      : { x, y };
  };

  await expect.poll(readBallPosition, { timeout: 2_000 }).not.toBeNull();
  const initialPosition = await readBallPosition();
  expect(initialPosition).not.toBeNull();
  await page.waitForTimeout(800);
  const movingPosition = await readBallPosition();
  const zoom = Number(await canvas.getAttribute('data-camera-zoom'));
  expect(movingPosition).not.toBeNull();
  expect(Number.isFinite(zoom) && zoom > 0).toBe(true);
  if (initialPosition !== null && movingPosition !== null) {
    expect(
      Math.hypot(movingPosition.x - initialPosition.x, movingPosition.y - initialPosition.y) * zoom,
    ).toBeGreaterThan(10);
  }

  const failedResult = page.getByRole('region', { name: 'Résultat du niveau' });
  await expect(failedResult).toBeVisible({ timeout: 15_000 });
  await expect(failedResult.getByText('Échec')).toBeVisible();
  await expect(failedResult.getByText(/Hors de la scène|Temps écoulé/)).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await failedResult.getByRole('button', { name: 'Réinitialiser' }).tap();

  await page.getByRole('button', { name: 'Ouvrir le catalogue' }).tap();
  await page.getByRole('button', { name: 'Poutre courte' }).tap();
  await tapWorldPoint(page, { x: 5.0, y: 2.15 });
  await page.getByRole('button', { name: 'Tester' }).tap();

  const victoryResult = page.getByRole('region', { name: 'Résultat du niveau' });
  await expect(victoryResult).toBeVisible({ timeout: 15_000 });
  await expect(victoryResult.getByText('Victoire')).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);

  const boardBounds = await board.boundingBox();
  const resultBounds = await victoryResult.boundingBox();
  expect(boardBounds).not.toBeNull();
  expect(resultBounds).not.toBeNull();
  if (boardBounds !== null && resultBounds !== null) {
    expect(resultBounds.y).toBeGreaterThanOrEqual(boardBounds.y + boardBounds.height - 1);
  }
  await expect(victoryResult.getByRole('button', { name: 'Rejouer le niveau' })).toBeVisible();
  await expect(victoryResult.getByRole('button', { name: 'Retour aux niveaux' })).toBeVisible();
});

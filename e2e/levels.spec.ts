import { expect, test, type Page } from '@playwright/test';

const levelOnePath = '/levels/level-1-prolonger-la-pente/play';

interface WorldPoint {
  readonly x: number;
  readonly y: number;
}

const tapWorldPoint = async (page: Page, point: WorldPoint): Promise<void> => {
  const canvas = page.getByRole('img', { name: 'Rendu du plateau' });
  const bounds = await canvas.boundingBox();
  const rawOrigin = await canvas.getAttribute('data-camera-origin');
  const zoom = Number(await canvas.getAttribute('data-camera-zoom'));
  expect(bounds).not.toBeNull();
  expect(rawOrigin).not.toBeNull();
  expect(Number.isFinite(zoom) && zoom > 0).toBe(true);
  if (bounds === null || rawOrigin === null || !Number.isFinite(zoom) || zoom <= 0) return;

  const [originX, originY] = rawOrigin.split(',').map(Number);
  expect(Number.isFinite(originX) && Number.isFinite(originY)).toBe(true);
  if (originX === undefined || originY === undefined) return;

  await page.touchscreen.tap(
    bounds.x + (point.x - originX) * zoom,
    bounds.y + (point.y - originY) * zoom,
  );
};

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
  await page.getByRole('button', { name: 'Poutre moyenne' }).tap();
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

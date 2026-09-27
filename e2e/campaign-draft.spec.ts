import { expect, test, type Page } from '@playwright/test';

const tapWorldPoint = async (page: Page, x: number, y: number): Promise<void> => {
  const canvas = page.getByRole('img', { name: 'Rendu du plateau' });
  const bounds = await canvas.boundingBox();
  const rawOrigin = await canvas.getAttribute('data-camera-origin');
  const zoom = Number(await canvas.getAttribute('data-camera-zoom'));
  if (bounds === null || rawOrigin === null || !(zoom > 0)) {
    throw new Error('Le repère caméra doit être disponible.');
  }
  const [originX, originY] = rawOrigin.split(',').map(Number);
  if (originX === undefined || originY === undefined) throw new Error('Origine caméra absente.');
  await page.touchscreen.tap(bounds.x + (x - originX) * zoom, bounds.y + (y - originY) * zoom);
};

const storedRampX = (page: Page): Promise<number | null> =>
  page.evaluate(() => {
    const raw = localStorage.getItem('contrapt:draft:level-2-le-pont-brouillon');
    if (raw === null) return null;
    // The draft envelope stores the L22 file as an escaped JSON string.
    const match = /\\"id\\": \\"ramp\\"[\s\S]*?\\"x\\": ([0-9.]+)/u.exec(raw);
    return match?.[1] === undefined ? null : Number(match[1]);
  });

test('édite une copie du niveau 2 au toucher, la conserve et l’exporte (U17)', async ({
  page,
  context,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'Le parcours d’édition est validé sur mobile.');

  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/levels');
  await page.getByRole('button', { name: 'Éditer le niveau 2' }).tap();

  await expect(page).toHaveURL(/\/editor\?draft=level-2-le-pont-brouillon$/u);
  await expect(page.getByRole('button', { name: 'Exporter le niveau' })).toBeVisible();
  expect(await storedRampX(page)).toBe(5);

  // The ramp is locked for the player; the author moves it.
  await tapWorldPoint(page, 5.0, 2.3);
  const openProperties = page.getByRole('button', { name: 'Ouvrir les propriétés' });
  if (await openProperties.isVisible()) await openProperties.tap();
  await page.getByRole('button', { name: 'Vers la droite' }).tap();
  await expect.poll(() => storedRampX(page)).toBeGreaterThan(5);

  await page.reload();
  await expect(page.getByRole('button', { name: 'Exporter le niveau' })).toBeVisible();
  expect(await storedRampX(page)).toBeGreaterThan(5);

  await page.getByRole('button', { name: 'Exporter le niveau' }).tap();
  const dialog = page.getByRole('dialog', { name: 'Exporter le niveau' });
  await dialog.getByRole('button', { name: 'Copier le lien de partage' }).tap();
  await expect(dialog.getByRole('status')).toHaveText('Lien copié');
  const link = await page.evaluate(() => navigator.clipboard.readText());

  await page.goto(link);
  await expect(page.getByText('Partage · Le pont (brouillon)')).toBeVisible();

  await page.goto('/levels/level-2-le-pont/play');
  await expect(page.getByText('Niveau 2 · Le pont')).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('contrapt:progress'))).toBeNull();
});

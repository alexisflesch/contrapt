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

const storedWallX = (page: Page): Promise<number | null> =>
  page.evaluate(() => {
    const raw = localStorage.getItem('tinkerbolt:draft:campaign-02-par-dessus-le-mur-brouillon');
    if (raw === null) return null;
    const envelope = JSON.parse(raw) as { data?: { levelFile?: string } };
    const document =
      envelope.data?.levelFile === undefined
        ? null
        : (JSON.parse(envelope.data.levelFile) as {
            objects?: Array<{ id?: string; transform?: { position?: { x?: number } } }>;
          });
    const wall = document?.objects?.find((object) => object.id === 'wall');
    return wall?.transform?.position?.x ?? null;
  });

test('édite une esquisse de campagne au toucher et conserve le brouillon', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'Le parcours d’édition est validé sur mobile.');

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/levels');
  await page.getByRole('button', { name: 'Éditer le niveau 2' }).tap();

  await expect(page).toHaveURL(/\/editor\?draft=campaign-02-par-dessus-le-mur-brouillon$/u);
  await expect(page.getByText('Mode éditeur')).toBeVisible();
  expect(await storedWallX(page)).toBe(5);

  await tapWorldPoint(page, 5, 3.6);
  const openProperties = page.getByRole('button', { name: 'Ouvrir les propriétés' });
  if (await openProperties.isVisible()) await openProperties.tap();
  await page.getByRole('button', { name: 'Vers la droite' }).tap();
  await expect.poll(() => storedWallX(page)).toBeGreaterThan(5);

  await page.reload();
  await expect(page.getByText('Mode éditeur')).toBeVisible();
  expect(await storedWallX(page)).toBeGreaterThan(5);
  await expect(page.getByRole('button', { name: 'Exporter le niveau' })).toBeVisible();
});

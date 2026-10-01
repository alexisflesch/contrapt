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

/** M11: level 2 can only be modified once level 1 is resolved (ADR 0015, ADR 0010). */
const resolveLevelOne = async (page: Page): Promise<void> => {
  await page.addInitScript(() => {
    localStorage.setItem(
      'tinkerbolt:progress',
      JSON.stringify({
        kind: 'progress',
        version: 1,
        data: { 'campaign-01-la-bille-de-service': { resolved: true, bestObjectCount: 1 } },
      }),
    );
  });
};

const storedWallX = (page: Page): Promise<number | null> =>
  page.evaluate(() => {
    const raw = localStorage.getItem('tinkerbolt:draft:campaign-02-par-dessus-le-mur-brouillon');
    if (raw === null) return null;
    const envelope = JSON.parse(raw) as {
      data?: {
        document?: {
          objects?: Array<{ id?: string; transform?: { position?: { x?: number } } }>;
        };
      };
    };
    const document = envelope.data?.document ?? null;
    const wall = document?.objects?.find((object) => object.id === 'wall');
    return wall?.transform?.position?.x ?? null;
  });

test('édite une esquisse de campagne au toucher et conserve le brouillon', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'Le parcours d’édition est validé sur mobile.');

  await page.setViewportSize({ width: 390, height: 844 });
  await resolveLevelOne(page);
  await page.goto('/levels');
  await page.getByRole('button', { name: 'Modifier le niveau 2' }).tap();
  // A production build shows no calibration guide (M11, ADR 0015 § Révéler).
  await expect(page.getByText('Mode éditeur')).toBeVisible();
  await expect(page.getByRole('dialog', { name: 'Fiche de calibrage' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Ouvrir le catalogue' }).tap();
  await expect(page.getByRole('button', { name: 'Ouvrir la fiche de calibrage' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Fermer le catalogue' }).tap();

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

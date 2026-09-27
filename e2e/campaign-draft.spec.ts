import { expect, test, type Page } from '@playwright/test';

import { createLocalStorageDraftRepository } from '../src/infrastructure/storage/local-storage-draft-repository';

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

const draftKey = 'contrapt:draft:level-2-le-pont-brouillon';

/** Reads the stored draft back through the draft repository, as the app does. */
const storedDraft = async (page: Page) => {
  const raw = await page.evaluate((key) => localStorage.getItem(key), draftKey);
  const entries = new Map(raw === null ? [] : [[draftKey, raw]]);
  const storage: Storage = {
    get length() {
      return entries.size;
    },
    clear: () => {
      entries.clear();
    },
    getItem: (key) => entries.get(key) ?? null,
    key: (index) => [...entries.keys()][index] ?? null,
    removeItem: (key) => {
      entries.delete(key);
    },
    setItem: (key, value) => {
      entries.set(key, value);
    },
  };
  const result = createLocalStorageDraftRepository(storage).load('level-2-le-pont-brouillon');
  return result.status === 'ok' ? result.document : null;
};

const placeFromCatalogue = async (page: Page, card: string, x: number, y: number) => {
  // The object just placed is selected: its properties sheet covers the catalogue.
  const closeProperties = page.getByRole('button', { name: 'Fermer les propriétés' });
  if (await closeProperties.isVisible()) await closeProperties.tap();
  const openCatalogue = page.getByRole('button', { name: 'Ouvrir le catalogue' });
  if (await openCatalogue.isVisible()) await openCatalogue.tap();
  await page
    .getByRole('region', { name: 'Objets disponibles' })
    .getByRole('button', { name: card })
    .tap();
  await tapWorldPoint(page, x, y);
};

test('ajoute une poutre et une balle rouge au brouillon du niveau 2, puis annule (U20)', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'Le parcours d’édition est validé sur mobile.');

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/levels');
  await page.getByRole('button', { name: 'Éditer le niveau 2' }).tap();
  await expect(page).toHaveURL(/\/editor\?draft=level-2-le-pont-brouillon$/u);
  const canvas = page.getByRole('img', { name: 'Rendu du plateau' });
  await expect(canvas).toHaveAttribute('data-red-balls', 'ball-1');
  await expect(canvas).toHaveAttribute('data-blue-balls', '');

  // The author's catalogue neither needs nor consumes the player's inventory.
  const inventoryBefore = (await storedDraft(page))?.inventory;
  await placeFromCatalogue(page, 'Poutre moyenne', 4.5, 4.2);
  await expect
    .poll(async () =>
      (await storedDraft(page))?.objects
        .filter(({ type }) => type === 'beam')
        .map(({ props }) => props),
    )
    .toEqual([{ size: 'short' }, { size: 'short' }, { size: 'medium' }]);
  expect((await storedDraft(page))?.inventory).toEqual(inventoryBefore);

  await placeFromCatalogue(page, 'Balle bleue', 6.0, 0.8);
  await expect(canvas).toHaveAttribute('data-red-balls', 'ball-1');
  const blueBall = await canvas.getAttribute('data-blue-balls');
  expect(blueBall).toMatch(/^placement-\d+$/u);
  await expect.poll(async () => (await storedDraft(page))?.goal.ballId).toBe('ball-1');

  await page.getByRole('button', { name: 'Annuler' }).tap();
  await expect(canvas).toHaveAttribute('data-red-balls', 'ball-1');
  await expect(canvas).toHaveAttribute('data-blue-balls', '');
  await expect.poll(async () => (await storedDraft(page))?.goal.ballId).toBe('ball-1');
});

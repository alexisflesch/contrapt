import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';

import { decodeLevelFile } from '../src/infrastructure/level-file/level-file-codec';
import { markBeamToPlace, openMachineDraft } from './puzzle-machine';

test('exporte le puzzle vérifié en fichier puis en lien de partage au toucher (U16, U22)', async ({
  page,
  context,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'Le parcours d’export est validé sur mobile.');

  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.setViewportSize({ width: 390, height: 844 });
  await openMachineDraft(page);
  await expect(page.getByText('Mode éditeur')).toBeVisible();
  await markBeamToPlace(page);

  await page.getByRole('button', { name: 'Exporter le niveau' }).tap();
  const dialog = page.getByRole('dialog', { name: 'Exporter le niveau' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText(/Puzzle vérifié/u)).toBeVisible();

  const downloadPromise = page.waitForEvent('download');
  await dialog.getByRole('button', { name: 'Télécharger le fichier' }).tap();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('machine-u22.json');
  const decoded = decodeLevelFile(await readFile(await download.path(), 'utf8'));
  expect(decoded.status).toBe('ok');
  if (decoded.status === 'ok') {
    expect(decoded.document.objects.map(({ id }) => id)).toEqual(['ball-1', 'slope', 'basket-1']);
    expect(decoded.document.solution?.placements).toHaveLength(1);
  }

  await dialog.getByRole('button', { name: 'Copier le lien de partage' }).tap();
  await expect(dialog.getByRole('status')).toHaveText('Lien copié');
  const link = await page.evaluate(() => navigator.clipboard.readText());
  expect(new URL(link).pathname).toBe('/shared');

  await page.goto(link);
  await expect(page.getByText('Partage · Machine U22')).toBeVisible();
  await expect(page.getByText('Mode joueur')).toBeVisible();
});

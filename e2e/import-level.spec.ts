import { mkdir, readFile } from 'node:fs/promises';

import { expect, test } from '@playwright/test';

test('importe un JSON depuis la page dédiée et ouvre son nouveau brouillon', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'Le parcours tactile est validé sur mobile.');
  await page.goto('/');
  await page.getByRole('button', { name: 'Ouvrir le menu' }).tap();
  await page.getByRole('button', { name: 'Importer un fichier JSON' }).tap();
  await expect(page.getByRole('region', { name: 'Importer un niveau JSON' })).toBeVisible();

  await mkdir('test-results/import', { recursive: true });
  for (const viewport of [
    { width: 390, height: 844 },
    { width: 844, height: 390 },
    { width: 1440, height: 900 },
  ]) {
    await page.setViewportSize(viewport);
    await page.screenshot({
      path: `test-results/import/import-${String(viewport.width)}x${String(viewport.height)}.png`,
      fullPage: true,
    });
  }
  await page.setViewportSize({ width: 390, height: 844 });

  const document = await readFile('src/content/levels/demo.json', 'utf8');
  await expect(page.getByRole('button', { name: 'Choisir un fichier JSON' })).toBeVisible();
  await page.locator('input[type="file"]').setInputFiles({
    name: 'puzzle.json',
    mimeType: 'application/json',
    buffer: Buffer.from(document),
  });
  await expect(page.getByRole('status')).toContainText('Démonstration');
  await page.getByRole('button', { name: 'Importer dans un nouveau brouillon' }).tap();

  await expect(page).toHaveURL(/\/editor\?draft=import-[a-f0-9]{32}$/u);
  await expect(page.getByText('Mode éditeur')).toBeVisible();
  await expect(page.getByRole('region', { name: 'Plateau de jeu' })).toBeVisible();
});

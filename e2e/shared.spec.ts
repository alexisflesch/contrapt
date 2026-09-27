import { expect, test } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

import sharedLevel from '../src/content/levels/level-2-le-pont.json' with { type: 'json' };
import { decodeLevelFile } from '../src/infrastructure/level-file/level-file-codec';
import { encodeShareFragment } from '../src/infrastructure/level-share/level-share-codec';

test('ouvre un lien partagé fabriqué par le codec sur mobile', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'Le parcours de partage est validé sur mobile.');

  const fileResult = decodeLevelFile(JSON.stringify(sharedLevel));
  expect(fileResult.status).toBe('ok');
  if (fileResult.status !== 'ok') return;

  const fragment = await encodeShareFragment(fileResult.document);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/shared${fragment}`);

  await expect(page.getByText('Partage · Le pont')).toBeVisible();
  await expect(page.getByText('Mode joueur')).toBeVisible();
  await expect(page.getByRole('region', { name: 'Plateau de jeu' })).toBeVisible();

  await mkdir('test-results/shared', { recursive: true });
  await page.screenshot({
    path: 'test-results/shared/shared-level-390x844.png',
    fullPage: true,
    scale: 'css',
  });
  await page.setViewportSize({ width: 844, height: 390 });
  await page.screenshot({
    path: 'test-results/shared/shared-level-844x390.png',
    fullPage: true,
    scale: 'css',
  });
});

test('affiche un message utile pour un partage invalide sur mobile', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'La route de partage est validée sur mobile.');

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/shared#level=bad');
  await expect(page.getByRole('alert')).toHaveText(
    'Ce lien de partage est invalide ou ne peut plus être ouvert.',
  );
  await expect(page.getByRole('link', { name: 'Liste des niveaux' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Plateau de jeu' })).toHaveCount(0);

  await page.screenshot({
    path: 'test-results/shared/shared-error-390x844.png',
    fullPage: true,
    scale: 'css',
  });
});

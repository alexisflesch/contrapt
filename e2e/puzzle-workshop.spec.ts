import { expect, test } from '@playwright/test';

import { machineBeam, markBeamToPlace, openMachineDraft, tapWorldPoint } from './puzzle-machine';

test('marque un objet à placer puis résout le puzzle comme un joueur, au toucher (U22)', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'Le parcours de l’atelier est validé sur mobile.');

  await page.setViewportSize({ width: 390, height: 844 });
  await openMachineDraft(page);
  await markBeamToPlace(page);

  await page.getByRole('button', { name: 'Essayer en joueur' }).tap();
  await expect(page.getByText('Mode joueur')).toBeVisible();
  await page.getByRole('button', { name: 'Ouvrir le catalogue' }).tap();
  await page.getByRole('button', { name: /^Poutre courte/u }).tap();
  await tapWorldPoint(page, machineBeam.x, machineBeam.y);
  await page.getByRole('button', { name: 'Lancer', exact: true }).tap();

  const result = page.getByRole('region', { name: 'Résultat du niveau' });
  await expect(result).toContainText('Victoire', { timeout: 15_000 });
  await result.getByRole('button', { name: 'Retour à l’atelier' }).tap();

  await expect(page.getByText('Mode éditeur')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Exporter le niveau' })).toBeVisible();
});

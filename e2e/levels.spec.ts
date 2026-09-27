import { expect, test } from '@playwright/test';

const campaignIds = [
  'campaign-01-la-bille-de-service',
  'campaign-02-par-dessus-le-mur',
  'campaign-03-la-balancoire',
  'campaign-04-retour-a-l-expediteur',
  'campaign-05-l-electricien',
  'campaign-06-la-porte-de-trop',
  'campaign-07-service-a-l-etage',
  'campaign-08-le-courant-d-air',
  'campaign-09-lever-le-rideau',
  'campaign-10-le-paravent-de-balles',
  'campaign-11-apres-vous',
  'campaign-12-treize-secondes',
  'campaign-13-une-seule-main',
  'campaign-14-l-aiguillage',
  'campaign-15-le-sonneur',
  'campaign-16-deux-souffles',
  'campaign-17-la-grande-machine',
] as const;

test('présente la campagne esquissée en cinq chapitres', async ({ page }) => {
  await page.goto('/levels');

  const levelList = page.getByRole('region', { name: 'Liste des niveaux' });
  await expect(levelList).toBeVisible();
  for (const chapter of [
    'Chapitre 1 · Les billes de service',
    'Chapitre 2 · Commandes à distance',
    'Chapitre 3 · Le vent',
    "Chapitre 4 · L'ordre et le temps",
    'Chapitre 5 · Grandes machines',
  ]) {
    await expect(levelList.getByRole('region', { name: chapter })).toBeVisible();
  }

  for (const [index] of campaignIds.entries()) {
    await expect(
      levelList.getByRole('region', { name: `Niveau ${String(index + 1)}`, exact: true }),
    ).toBeVisible();
    const launch = levelList.getByRole('button', {
      name: 'Lancer le niveau ' + String(index + 1),
      exact: true,
    });
    if (index === 0) await expect(launch).toBeEnabled();
    else await expect(launch).toBeDisabled();
  }
  await expect(levelList.getByText('Esquisse non calibrée.').first()).toBeVisible();
});

test('ouvre la première esquisse jouable avec son inventaire tactile', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'Le parcours tactile est validé sur mobile.');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/levels/campaign-01-la-bille-de-service/play');

  await expect(page.getByText('Niveau 1 · La bille de service')).toBeVisible();
  await expect(page.getByText('Mode joueur')).toBeVisible();
  await expect(page.getByRole('region', { name: 'Plateau de jeu' })).toBeVisible();
  const drawer = page.getByRole('region', { name: 'Objets disponibles' });
  await drawer.getByRole('button', { name: 'Ouvrir le catalogue' }).tap();
  await expect(drawer.getByRole('button', { name: /Poutre courte/ })).toBeVisible();
  await expect(drawer.getByRole('button', { name: /Tremplin/ })).toBeVisible();
});

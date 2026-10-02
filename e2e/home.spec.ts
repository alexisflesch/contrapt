import { expect, test } from '@playwright/test';

test('présente l’accueil sans débordement et mène à la campagne au tactile', async ({ page }) => {
  for (const viewport of [
    { width: 390, height: 844 },
    { width: 844, height: 390 },
    { width: 1440, height: 900 },
    { width: 320, height: 568 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto('/');
    await expect(
      page.getByRole('heading', { name: 'Les bonnes idées font leur chemin.' }),
    ).toBeVisible();
    await expect(
      page.getByRole('progressbar', { name: 'Progression de la campagne' }),
    ).toHaveAttribute('value', '0');
    await expect
      .poll(() =>
        page
          .locator('.home-sprite')
          .evaluateAll((images) =>
            images.every(
              (image) =>
                image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0,
            ),
          ),
      )
      .toBe(true);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth),
    ).toBe(false);
    const launch = page.getByRole('link', { name: 'Jouer', exact: true });
    const bounds = await launch.boundingBox();
    if (bounds === null) throw new Error('La commande principale doit être visible.');
    expect(bounds.width).toBeGreaterThanOrEqual(44);
    expect(bounds.height).toBeGreaterThanOrEqual(44);
    await page.screenshot({
      path: `test-results/home/accueil-${String(viewport.width)}x${String(viewport.height)}.png`,
      fullPage: true,
    });
  }
  await page.getByRole('link', { name: 'Jouer', exact: true }).tap();
  await expect(page).toHaveURL(/\/levels$/);
  await expect(page.getByRole('region', { name: 'Liste des niveaux' })).toBeVisible();
});

test('ouvre chaque destination et revient à l’accueil depuis le menu', async ({ page }) => {
  await page.goto('/');
  for (const { name, path } of [
    { name: 'La campagne', path: '/levels' },
    { name: 'L’atelier', path: '/editor' },
    { name: 'Paramètres', path: '/settings' },
  ]) {
    const destinations = page.getByRole('navigation', { name: 'Explorer TinkerBolt' });
    await destinations.getByRole('link', { name: new RegExp(name) }).tap();
    await expect(page).toHaveURL(new RegExp(`${path}$`));
    await page.getByRole('button', { name: 'Ouvrir le menu' }).tap();
    await page.getByRole('button', { name: 'Accueil', exact: true }).tap();
    await expect(
      page.getByRole('heading', { name: 'Les bonnes idées font leur chemin.' }),
    ).toBeVisible();
  }
  await page.goBack();
  await expect(page).toHaveURL(/\/settings$/);
  await page.goForward();
  await expect(page).toHaveURL(/\/$/);
});

test('reprend la progression enregistrée après rechargement', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    localStorage.setItem(
      'tinkerbolt:progress',
      JSON.stringify({
        kind: 'progress',
        version: 1,
        data: { 'tuto-1': { resolved: true, bestObjectCount: 1 } },
      }),
    );
  });
  await page.goto('/');
  await page.reload();
  await expect(page.getByRole('region', { name: 'Ton carnet de bord' })).toContainText('1 / 5');
  await expect(
    page.getByRole('progressbar', { name: 'Progression de la campagne' }),
  ).toHaveAttribute('value', '1');
  await page.screenshot({
    path: 'test-results/home/accueil-progression-390x844.png',
    fullPage: true,
  });
  await page.getByRole('link', { name: 'Jouer', exact: true }).tap();
  await expect(page).toHaveURL(/\/levels$/);
  await expect(page.getByRole('button', { name: 'Lancer le niveau 2', exact: true })).toBeEnabled();
});

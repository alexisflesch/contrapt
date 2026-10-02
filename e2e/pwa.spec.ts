import { expect, test } from '@playwright/test';

test.use({ serviceWorkers: 'allow' });

test('ouvre le niveau 1 hors ligne après le premier chargement', async ({ page, context }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'TinkerBolt' })).toBeVisible();

  await expect
    .poll(
      () =>
        page.evaluate(async () => {
          const registration = await navigator.serviceWorker.getRegistration();
          return registration?.active?.state === 'activated';
        }),
      { timeout: 15_000 },
    )
    .toBe(true);

  await page.goto('/levels/tuto-1/play');
  await expect(page.getByText(/^Niveau 1\b/)).toBeVisible();

  await context.setOffline(true);
  await page.reload();

  await expect(page.getByRole('heading', { name: 'TinkerBolt' })).toBeVisible();
  await expect(page.getByText(/^Niveau 1\b/)).toBeVisible();
});

test('ouvre « Mes niveaux » hors ligne après le premier chargement (V2c)', async ({
  page,
  context,
}) => {
  await page.goto('/');
  await expect
    .poll(
      () =>
        page.evaluate(async () => {
          const registration = await navigator.serviceWorker.getRegistration();
          return registration?.active?.state === 'activated';
        }),
      { timeout: 15_000 },
    )
    .toBe(true);

  await page.goto('/my-levels');
  await expect(page.getByRole('region', { name: 'Niveaux reçus' })).toBeVisible();

  await context.setOffline(true);
  await page.reload();

  await expect(page.getByRole('region', { name: 'Niveaux reçus' })).toBeVisible();
});

test('précache la police et les sprites, pas les fonds inutilisés (V7)', async ({ request }) => {
  const response = await request.get('/sw.js');
  expect(response.ok()).toBe(true);
  const serviceWorker = await response.text();

  expect(serviceWorker).toContain('fonts/Nunito.woff2');
  expect(serviceWorker).toContain('assets/sprites/thumbs/basket.png');
  expect(serviceWorker).not.toContain('assets/backgrounds/');
});

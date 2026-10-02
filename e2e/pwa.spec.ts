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

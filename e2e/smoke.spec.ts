import { expect, test } from '@playwright/test';

test('affiche la coque Contrapt! sur un écran mobile', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveTitle('Contrapt!');
  await expect(page.getByRole('heading', { name: 'Contrapt!' })).toBeVisible();
  await expect(page.getByText('Éditeur de niveaux')).toBeVisible();
  await expect(page.getByText('Mode éditeur')).toBeVisible();
  const board = page.getByRole('region', { name: 'Plateau de jeu' });
  await expect(board).toBeVisible();
  await expect(
    page.getByText('Le plateau est prêt pour votre prochaine construction.'),
  ).toHaveCount(0);
  await expect(page.getByText('Préparez votre machine')).toHaveCount(0);
  await expect(board.getByRole('img', { name: 'Rendu du plateau' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Objets disponibles' })).toBeVisible();

  const openCatalogueButton = page.getByRole('button', { name: 'Ouvrir le catalogue' });
  if ((await openCatalogueButton.count()) > 0) {
    await openCatalogueButton.click();
  }

  for (const objectName of ['Balle', 'Panier', 'Poutre', 'Bascule']) {
    await expect(page.getByRole('button', { name: new RegExp(objectName) })).toBeVisible();
  }
});

test.describe('coque sur le petit viewport supporté', () => {
  test.use({
    hasTouch: true,
    isMobile: true,
    viewport: { width: 320, height: 568 },
  });

  test('conserve les actions essentielles et un tiroir contrôlable', async ({ page }) => {
    await page.goto('/');

    const horizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(horizontalOverflow).toBe(false);

    for (const actionName of [
      'Ouvrir le menu',
      'Annuler',
      'Rétablir',
      'Tester',
      'Zoom arrière',
      'Ajuster à la scène',
      'Zoom avant',
    ]) {
      const action = page.getByRole('button', { name: actionName });
      await expect(action).toBeVisible();
      const box = await action.boundingBox();
      expect(box).not.toBeNull();
      if (box !== null) {
        expect(box.x).toBeGreaterThanOrEqual(0);
        expect(box.x + box.width).toBeLessThanOrEqual(320);
        expect(box.y).toBeGreaterThanOrEqual(0);
        expect(box.y + box.height).toBeLessThanOrEqual(568);
      }
    }

    const drawer = page.getByRole('region', { name: 'Objets disponibles' });
    await expect(drawer).toHaveCSS('position', 'fixed');
    await expect(drawer.locator('.drawer-content')).toHaveCSS('overflow-y', 'auto');

    const workspace = page.getByRole('region', { name: 'Espace de construction' });
    const workspaceBoundsBefore = await workspace.boundingBox();
    expect(workspaceBoundsBefore).not.toBeNull();

    const openButton = page.getByRole('button', { name: 'Ouvrir le catalogue' });
    await expect(openButton).toHaveAttribute('aria-expanded', 'false');
    await expect(page.getByRole('button', { name: /Balle/ })).toBeHidden();

    const collapsedDrawerBounds = await drawer.boundingBox();
    expect(collapsedDrawerBounds).not.toBeNull();
    if (collapsedDrawerBounds !== null) {
      expect(collapsedDrawerBounds.y).toBeGreaterThan(0);
      expect(collapsedDrawerBounds.y + collapsedDrawerBounds.height).toBeLessThanOrEqual(568);
      expect(collapsedDrawerBounds.height).toBeLessThan(150);
    }

    const drawerFitsViewport = await drawer.evaluate((element) => {
      const bounds = element.getBoundingClientRect();
      return bounds.top >= 0 && bounds.bottom <= window.innerHeight;
    });
    expect(drawerFitsViewport).toBe(true);

    await openButton.click();
    const collapseButton = page.getByRole('button', { name: 'Replier le catalogue' });
    await expect(collapseButton).toHaveAttribute('aria-expanded', 'true');
    await expect(page.getByRole('button', { name: /Balle/ })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Fermer le catalogue' })).toBeVisible();

    const openDrawerBounds = await drawer.boundingBox();
    expect(openDrawerBounds).not.toBeNull();
    if (openDrawerBounds !== null && collapsedDrawerBounds !== null) {
      expect(openDrawerBounds.y).toBeGreaterThan(0);
      expect(openDrawerBounds.y + openDrawerBounds.height).toBeLessThanOrEqual(568);
      expect(openDrawerBounds.height).toBeGreaterThan(collapsedDrawerBounds.height);
    }

    await collapseButton.click();
    await expect(page.getByRole('button', { name: 'Ouvrir le catalogue' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Balle/ })).toBeHidden();

    for (const actionName of [
      'Ouvrir le menu',
      'Annuler',
      'Rétablir',
      'Tester',
      'Zoom arrière',
      'Ajuster à la scène',
      'Zoom avant',
    ]) {
      await expect(page.getByRole('button', { name: actionName })).toBeVisible();
    }

    await openButton.click();
    await expect(page.getByRole('button', { name: 'Replier le catalogue' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Balle/ })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Fermer le catalogue' })).toBeVisible();

    const workspaceBoundsAfter = await workspace.boundingBox();
    expect(workspaceBoundsAfter).not.toBeNull();
    if (workspaceBoundsBefore !== null && workspaceBoundsAfter !== null) {
      expect(workspaceBoundsAfter.x).toBeCloseTo(workspaceBoundsBefore.x);
      expect(workspaceBoundsAfter.y).toBeCloseTo(workspaceBoundsBefore.y);
      expect(workspaceBoundsAfter.width).toBeCloseTo(workspaceBoundsBefore.width);
      expect(workspaceBoundsAfter.height).toBeCloseTo(workspaceBoundsBefore.height);
    }

    await page.locator('.drawer-scrim').click({ position: { x: 160, y: 80 } });
    await expect(page.getByRole('button', { name: 'Ouvrir le catalogue' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Balle/ })).toBeHidden();
    await expect(page.getByRole('button', { name: 'Fermer le catalogue' })).toBeHidden();
  });
});

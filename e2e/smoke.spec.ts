import { expect, test, type Page } from '@playwright/test';

/**
 * B1 (plan-remise-en-jeu.md § 4) moved the free-creation workshop off the
 * home screen: it is reachable only through ☰ → « Atelier de construction ».
 */
const openWorkshopFromMenu = async (page: Page): Promise<void> => {
  await page.getByRole('button', { name: 'Ouvrir le menu' }).click();
  await page.getByRole('button', { name: 'Atelier de construction' }).click();
};

test('lance depuis l’accueil le niveau 1', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveTitle('TinkerBolt');
  await expect(page.getByRole('heading', { name: 'TinkerBolt' })).toBeVisible();
  await page.getByRole('link', { name: 'Commencer à jouer' }).tap();
  await expect(page.getByText('Niveau 1 · Le petit pont')).toBeVisible();
  await expect(page.getByText('Mode joueur')).toBeVisible();
  const board = page.getByRole('region', { name: 'Plateau de jeu' });
  await expect(board).toBeVisible();
  await page.getByRole('button', { name: 'Voir l’objectif' }).click();
  await expect(page.getByRole('dialog', { name: 'Objectif du niveau' })).toContainText(
    'Faire entrer la balle dans le panier',
  );
  await page.getByRole('button', { name: 'Fermer l’objectif' }).click();
  await expect(board.getByRole('img', { name: 'Rendu du plateau' })).toBeVisible();

  // Level 1 provides one short beam; free editing history stays unavailable.
  await expect(page.getByRole('region', { name: 'Objets disponibles' })).toBeVisible();
  // Phone layouts keep the catalogue in a drawer; desktop shows it docked.
  const openCatalogue = page.getByRole('button', { name: 'Ouvrir le catalogue' });
  if ((await openCatalogue.count()) > 0) await openCatalogue.tap();
  await expect(page.getByRole('button', { name: 'Poutre courte' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Annuler' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Rétablir' })).toBeDisabled();
});

test('ouvre l’atelier depuis le menu et expose les familles du catalogue', async ({ page }) => {
  await page.goto('/');
  await openWorkshopFromMenu(page);

  await expect(page.getByText('Éditeur de niveaux')).toHaveCount(0);
  await expect(page.getByText('Mode éditeur')).toBeVisible();
  await expect(page.getByRole('region', { name: 'Objets disponibles' })).toBeVisible();
  for (const viewport of [
    { width: 390, height: 844 },
    { width: 844, height: 390 },
    { width: 1440, height: 900 },
  ]) {
    await page.setViewportSize(viewport);
    await page.screenshot({
      path: `test-results/u23/atelier-${String(viewport.width)}x${String(viewport.height)}.png`,
      fullPage: true,
    });
  }

  const openCatalogueButton = page.getByRole('button', { name: 'Ouvrir le catalogue' });
  if ((await openCatalogueButton.count()) > 0) {
    await openCatalogueButton.click();
  }

  await expect(page.getByRole('button', { name: /Balle rouge/ })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Panier/ })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Balle' })).toBeVisible();
  for (const objectName of [
    'Poutre',
    'Bascule',
    'Masse',
    'Levier',
    'Convoyeur',
    'Bouton',
    'Ventilateur',
    'Barrière',
    'Tremplin',
  ]) {
    await expect(page.getByRole('button', { name: new RegExp(objectName) })).toBeVisible();
  }
});

test.describe('coque sur le petit viewport supporté', () => {
  test.use({
    hasTouch: true,
    isMobile: true,
    viewport: { width: 320, height: 568 },
  });

  test('le bandeau de victoire ne recouvre pas le plateau', async ({ page }) => {
    // B1 (plan-remise-en-jeu.md § 4) : le bandeau de victoire recouvrait le
    // bas du plateau en overlay, cachant potentiellement la balle et le
    // panier. Il doit maintenant s'afficher entièrement sous le plateau.
    // A level that wins on its own, received from a file (V2a: the demo is gone).
    await page.goto('/my-levels');
    await page.locator('input[type="file"]').setInputFiles('test/fixtures/self-solving-level.json');
    await page
      .getByRole('region', { name: 'Niveaux reçus' })
      .getByRole('region', { name: 'Machine en chaîne' })
      .getByRole('button', { name: 'Jouer' })
      .tap();

    const board = page.getByRole('region', { name: 'Plateau de jeu' });
    await expect(board).toBeVisible();

    await page.getByRole('button', { name: 'Lancer' }).tap();

    const victory = page.getByRole('dialog', { name: 'Bravo !' });
    await expect(victory).toBeVisible({ timeout: 30_000 });
    await victory.getByRole('button', { name: 'Voir la scène' }).tap();

    const result = page.getByRole('region', { name: 'Résultat du niveau' });
    await expect(result).toBeVisible();

    const boardBounds = await board.boundingBox();
    const resultBounds = await result.boundingBox();
    expect(boardBounds).not.toBeNull();
    expect(resultBounds).not.toBeNull();

    if (boardBounds !== null && resultBounds !== null) {
      // The banner sits at or below the board's own bottom edge: no
      // vertical overlap, so it never covers what the player just watched.
      expect(resultBounds.y).toBeGreaterThanOrEqual(boardBounds.y + boardBounds.height - 1);
    }

    await expect(page.getByRole('button', { name: 'Recommencer' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Retour à Mes niveaux' })).toBeVisible();
  });

  test('conserve les actions essentielles et un tiroir contrôlable dans l’atelier', async ({
    page,
  }) => {
    await page.goto('/');
    await openWorkshopFromMenu(page);

    const horizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(horizontalOverflow).toBe(false);

    for (const actionName of [
      'Ouvrir le menu',
      'Annuler',
      'Rétablir',
      'Lancer',
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
    await expect(page.getByRole('button', { name: 'Balle' })).toBeHidden();

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
    await expect(page.getByRole('button', { name: 'Balle' })).toBeVisible();
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
    await expect(page.getByRole('button', { name: 'Balle' })).toBeHidden();

    for (const actionName of [
      'Ouvrir le menu',
      'Annuler',
      'Rétablir',
      'Lancer',
      'Zoom arrière',
      'Ajuster à la scène',
      'Zoom avant',
    ]) {
      await expect(page.getByRole('button', { name: actionName })).toBeVisible();
    }

    await openButton.click();
    await expect(page.getByRole('button', { name: 'Replier le catalogue' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Balle' })).toBeVisible();
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
    await expect(page.getByRole('button', { name: 'Balle' })).toBeHidden();
    await expect(page.getByRole('button', { name: 'Fermer le catalogue' })).toBeHidden();
  });

  test('affiche un aperçu valide avant le placement tactile dans la zone de construction', async ({
    page,
  }) => {
    await page.goto('/');
    await openWorkshopFromMenu(page);

    await page.getByRole('button', { name: 'Ouvrir le catalogue' }).tap();
    await page.getByRole('button', { name: 'Poutre moyenne' }).tap();

    const board = page.getByRole('region', { name: 'Plateau de jeu' });
    const renderer = board.getByRole('img', { name: 'Rendu du plateau' });
    const renderingBeforePreview = await renderer.screenshot();
    const bounds = await board.boundingBox();
    expect(bounds).not.toBeNull();
    if (bounds === null) {
      throw new Error('Le plateau doit avoir une zone tactile mesurable.');
    }

    await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);

    await expect(page.getByRole('status')).toContainText('Aperçu de placement valide');
    // U1: the ghost is drawn by the renderer, no DOM overlay sits on the board.
    await expect(renderer).toHaveAttribute('data-placement-ghost', 'valid');
    await expect(board.locator('.placement-preview')).toHaveCount(0);
    const renderingWithPreview = await renderer.screenshot();
    expect(renderingWithPreview.equals(renderingBeforePreview)).toBe(false);
  });

  test('place au tactile puis annule le placement sans laisser l’objet dans le rendu', async ({
    page,
  }) => {
    await page.goto('/');
    await openWorkshopFromMenu(page);

    const board = page.getByRole('region', { name: 'Plateau de jeu' });
    const renderer = board.getByRole('img', { name: 'Rendu du plateau' });
    const renderingBeforePlacement = await renderer.screenshot();

    await page.getByRole('button', { name: 'Ouvrir le catalogue' }).tap();
    await page.getByRole('button', { name: 'Poutre moyenne' }).tap();
    await board.tap({ position: { x: 160, y: 120 } });

    await expect(page.getByRole('button', { name: 'Annuler' })).toBeEnabled();
    const renderingAfterPlacement = await renderer.screenshot();
    expect(renderingAfterPlacement.equals(renderingBeforePlacement)).toBe(false);

    await page.getByRole('button', { name: 'Annuler' }).tap();
    await expect(page.getByRole('button', { name: 'Annuler' })).toBeDisabled();
    const renderingAfterUndo = await renderer.screenshot();
    expect(renderingAfterUndo).toEqual(renderingBeforePlacement);
  });

  test('modifie visiblement le cadrage avec zoom puis ajustement au tactile', async ({ page }) => {
    await page.goto('/levels/tuto-1/play');

    const renderer = page
      .getByRole('region', { name: 'Plateau de jeu' })
      .getByRole('img', { name: 'Rendu du plateau' });
    const initialRendering = await renderer.screenshot();

    await page.getByRole('button', { name: 'Zoom avant' }).tap();
    const zoomedRendering = await renderer.screenshot();
    expect(zoomedRendering.equals(initialRendering)).toBe(false);

    await page.getByRole('button', { name: 'Ajuster à la scène' }).tap();
    const adjustedRendering = await renderer.screenshot();
    expect(adjustedRendering.equals(zoomedRendering)).toBe(false);
  });
});

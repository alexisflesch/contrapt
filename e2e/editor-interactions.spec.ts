import { expect, test, type Locator, type Page } from '@playwright/test';

const openWorkshop = async (page: Page): Promise<void> => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Ouvrir le menu' }).click();
  await page.getByRole('button', { name: 'Atelier de construction' }).click();
  await expect(page.getByText('Mode éditeur')).toBeVisible();
};

const boardBounds = async (board: Locator) => {
  await expect(board).toBeVisible();
  const bounds = await board.boundingBox();
  expect(bounds).not.toBeNull();
  if (bounds === null) throw new Error('Le plateau doit avoir une zone tactile mesurable.');
  return bounds;
};

const closeCompactProperties = async (page: Page): Promise<void> => {
  const close = page.getByRole('button', { name: 'Fermer les propriétés' });
  if ((await close.count()) > 0 && (await close.first().isVisible())) {
    await close.first().click();
    await expect(page.getByRole('button', { name: 'Ouvrir les propriétés' })).toBeVisible();
  }
};

const openPropertiesIfCompact = async (page: Page): Promise<void> => {
  const open = page.getByRole('button', { name: 'Ouvrir les propriétés' });
  if ((await open.count()) > 0 && (await open.first().isVisible())) await open.first().click();
};

const chooseMediumBeam = async (page: Page): Promise<void> => {
  const openCatalogue = page.getByRole('button', { name: 'Ouvrir le catalogue' });
  if ((await openCatalogue.count()) > 0) await openCatalogue.click();

  const beam = page.getByRole('button', { name: 'Poutre moyenne' });
  await expect(beam).toBeVisible();
  await beam.click();
};

const placeBeamAtBoardCenter = async (page: Page): Promise<Locator> => {
  const board = page.getByRole('region', { name: 'Plateau de jeu' });
  const bounds = await boardBounds(board);
  const center = { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
  await page.mouse.click(center.x, center.y);

  const properties = page.getByRole('region', { name: 'Propriétés de Poutre' });
  await expect(properties).toBeVisible();
  return properties;
};

const waitForCanvasToMatch = async (canvas: Locator, expected: Buffer): Promise<void> => {
  await expect
    .poll(async () => (await canvas.screenshot()).equals(expected), { timeout: 2_000 })
    .toBe(true);
};

const waitForCanvasToDiffer = async (canvas: Locator, expected: Buffer): Promise<Buffer> => {
  let latest = await canvas.screenshot();
  await expect
    .poll(
      async () => {
        latest = await canvas.screenshot();
        return !latest.equals(expected);
      },
      { timeout: 2_000 },
    )
    .toBe(true);
  return latest;
};

const runConstructionInteractions = async (page: Page): Promise<void> => {
  await openWorkshop(page);
  await chooseMediumBeam(page);
  await placeBeamAtBoardCenter(page);

  // A selected placement opens the compact inspector. Close that overlay so
  // the next contact reaches the board itself on phone-sized viewports.
  await closeCompactProperties(page);

  const board = page.getByRole('region', { name: 'Plateau de jeu' });
  const canvas = board.getByRole('img', { name: 'Rendu du plateau' });
  const beforeMoveBounds = await boardBounds(board);
  const start = {
    x: beforeMoveBounds.x + beforeMoveBounds.width / 2,
    y: beforeMoveBounds.y + beforeMoveBounds.height / 2,
  };

  // Selection is not a history command. This is the placed beam already
  // visible on the canvas, selected through the same user input as a player.
  await page.mouse.click(start.x, start.y);
  await expect(page.getByRole('region', { name: 'Propriétés de Poutre' })).toBeVisible();
  await closeCompactProperties(page);

  const beforeDrag = await canvas.screenshot();
  const delta = Math.min(80, Math.max(28, beforeMoveBounds.width * 0.15));
  const target = {
    x: Math.min(beforeMoveBounds.x + beforeMoveBounds.width - 16, start.x + delta),
    y: start.y,
  };

  // page.mouse emits real browser pointer events; no React handler or
  // internal state is invoked by the test.
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(target.x, target.y, { steps: 8 });
  await page.mouse.up();

  const undo = page.getByRole('button', { name: 'Annuler', exact: true });
  const redo = page.getByRole('button', { name: 'Rétablir', exact: true });
  await expect(undo).toBeEnabled();
  await expect(redo).toBeDisabled();
  const afterDrag = await waitForCanvasToDiffer(canvas, beforeDrag);

  // One undo restores the exact pre-drag rendering and consumes the only
  // redoable move (the earlier placement remains undoable); one redo restores
  // the post-drag rendering.
  await undo.click();
  await expect(redo).toBeEnabled();
  await waitForCanvasToMatch(canvas, beforeDrag);

  await redo.click();
  await expect(undo).toBeEnabled();
  await expect(redo).toBeDisabled();
  await waitForCanvasToMatch(canvas, afterDrag);

  await openPropertiesIfCompact(page);
  const properties = page.getByRole('region', { name: 'Propriétés de Poutre' });
  await expect(properties).toBeVisible();
  const size = properties.getByRole('combobox', { name: 'Longueur de la poutre' });
  const beforeResize = await canvas.screenshot();
  await size.selectOption('long');
  await expect(size).toHaveValue('long');
  const afterResize = await waitForCanvasToDiffer(canvas, beforeResize);

  await properties.getByRole('button', { name: 'Supprimer la poutre', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Propriétés de Poutre' })).toHaveCount(0);
  await waitForCanvasToDiffer(canvas, afterResize);

  await expect(undo).toBeEnabled();
  await undo.click();
  // Removing clears the ephemeral selection. Select the restored beam again so
  // the exact canvas comparison uses the same selected state as afterResize.
  await page.mouse.click(target.x, target.y);
  await expect(page.getByRole('region', { name: 'Propriétés de Poutre' })).toBeVisible();
  await waitForCanvasToMatch(canvas, afterResize);
};

test('C3 — place, déplace, modifie et supprime une poutre dans Chromium desktop', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'Ce parcours est la validation Chromium desktop.');
  await runConstructionInteractions(page);
});

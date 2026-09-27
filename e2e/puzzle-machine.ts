import { expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';

import type { LevelDocument } from '../src/domain/level-document';
import { decodeLevelFile } from '../src/infrastructure/level-file/level-file-codec';
import { createLocalStorageDraftRepository } from '../src/infrastructure/storage/local-storage-draft-repository';

// Playwright's loader does not import JSON modules: read level 1 through the L22 codec.
const levelOneFile = decodeLevelFile(
  readFileSync(
    new URL('../src/content/levels/level-1-prolonger-la-pente.json', import.meta.url),
    'utf8',
  ),
);
if (levelOneFile.status !== 'ok') throw new Error('Niveau 1 embarqué illisible.');
const levelOne = levelOneFile.document;

/** U22: level 1 with its reference beam in place, still fixed — the author's complete machine. */
const machine: LevelDocument = {
  ...levelOne,
  id: 'machine-u22',
  metadata: { title: 'Machine U22' },
  objects: [
    ...levelOne.objects,
    {
      id: 'placement-1',
      type: 'beam',
      props: { size: 'short' },
      transform: { position: { x: 5, y: 2.15 }, rotation: 0 },
      permissions: { move: false, rotate: false, remove: false },
    },
  ],
};

/** Where the machine's beam lies, in world units. */
export const machineBeam = { x: 5, y: 2.15 } as const;

/** Stores the machine as a draft through the app's own repository, then opens it. */
export const openMachineDraft = async (page: Page): Promise<void> => {
  const entries = new Map<string, string>();
  const storage: Storage = {
    get length() {
      return entries.size;
    },
    clear: () => {
      entries.clear();
    },
    getItem: (key) => entries.get(key) ?? null,
    key: (index) => [...entries.keys()][index] ?? null,
    removeItem: (key) => {
      entries.delete(key);
    },
    setItem: (key, value) => {
      entries.set(key, value);
    },
  };
  createLocalStorageDraftRepository(storage).save(machine);

  await page.goto('/');
  await page.evaluate(
    (stored) => {
      for (const [key, value] of stored) localStorage.setItem(key, value);
    },
    [...entries],
  );
  await page.goto('/editor?draft=machine-u22');
};

export const tapWorldPoint = async (page: Page, x: number, y: number): Promise<void> => {
  const canvas = page.getByRole('img', { name: 'Rendu du plateau' });
  const bounds = await canvas.boundingBox();
  const rawOrigin = await canvas.getAttribute('data-camera-origin');
  const zoom = Number(await canvas.getAttribute('data-camera-zoom'));
  if (bounds === null || rawOrigin === null || !(zoom > 0)) {
    throw new Error('Le repère caméra doit être disponible.');
  }
  const [originX, originY] = rawOrigin.split(',').map(Number);
  if (originX === undefined || originY === undefined) throw new Error('Origine caméra absente.');
  await page.touchscreen.tap(bounds.x + (x - originX) * zoom, bounds.y + (y - originY) * zoom);
};

/** Selects the machine's beam and marks it « À placer » in the inspector, by touch. */
export const markBeamToPlace = async (page: Page): Promise<void> => {
  await tapWorldPoint(page, machineBeam.x, machineBeam.y);
  const openProperties = page.getByRole('button', { name: 'Ouvrir les propriétés' });
  if (await openProperties.isVisible()) await openProperties.tap();
  await page.getByRole('button', { name: 'À placer' }).tap();
  await expect(page.getByRole('button', { name: 'À placer' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  // On a phone the properties sheet covers the header actions: close it.
  const closeProperties = page.getByRole('button', { name: 'Fermer les propriétés' });
  if (await closeProperties.isVisible()) await closeProperties.tap();
};

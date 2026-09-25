import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { levelDocumentSchema } from '../domain/level-document';
import { projectLevel } from './board-renderer';
import { spriteAssetPath, spriteAssetsForFamily, spriteThumbnailPath } from './sprite-loader';

/** ADR 0007 § Convention de sprite. */
const PIXELS_PER_WORLD_UNIT_AT_2X = 128;
const SPRITE_BUDGET_BYTES = 60 * 1024;
/** Measured by `art/build-sprites.py`: the chevron pattern repeats every 77 px. */
const CONVEYOR_BELT_PERIOD_PX = 77;

const publicFile = (path: string): Buffer => readFileSync(resolve('public', `.${path}`));

/** Reads a PNG's pixel size from its IHDR chunk, without decoding the image. */
const pngSize = (bytes: Buffer): { readonly width: number; readonly height: number } => ({
  width: bytes.readUInt32BE(16),
  height: bytes.readUInt32BE(20),
});

const permissions = { move: true, rotate: false, remove: true } as const;

const everyFamily = levelDocumentSchema.parse({
  schemaVersion: 2,
  id: 'sprite-assets',
  metadata: { title: 'Toutes les familles' },
  objects: [
    {
      id: 'ball-1',
      type: 'ball',
      transform: { position: { x: 1, y: 1 }, rotation: 0 },
      props: {},
      permissions,
    },
    {
      id: 'basket-1',
      type: 'basket',
      transform: { position: { x: 3, y: 1 }, rotation: 0 },
      props: {},
      permissions,
    },
    {
      id: 'beam-1',
      type: 'beam',
      transform: { position: { x: 5, y: 3 }, rotation: 0 },
      // The single beam sprite is drawn at the long footprint and shortened.
      props: { size: 'long' },
      permissions,
    },
    {
      id: 'seesaw-1',
      type: 'seesaw',
      transform: { position: { x: 5, y: 5 }, rotation: 0 },
      props: {},
      permissions,
    },
    {
      id: 'mass-1',
      type: 'mass',
      transform: { position: { x: 7, y: 7 }, rotation: 0 },
      props: { weight: '10kg' },
      permissions,
    },
    {
      id: 'lever-1',
      type: 'lever',
      transform: { position: { x: 2, y: 8 }, rotation: 0 },
      props: { position: 'center' },
      permissions,
    },
    {
      id: 'conveyor-1',
      type: 'conveyor',
      transform: { position: { x: 5, y: 8 }, rotation: 0 },
      props: { direction: 'right' },
      permissions,
    },
    {
      id: 'conveyor-2',
      type: 'conveyor',
      transform: { position: { x: 5, y: 9 }, rotation: 0 },
      props: { direction: 'left' },
      permissions,
    },
  ],
  inventory: [],
  goal: { type: 'basket', ballId: 'ball-1', basketId: 'basket-1' },
  buildZones: [],
  scene: { min: { x: 0, y: 0 }, max: { x: 10, y: 10 } },
});

describe('sprites du plateau', () => {
  const layers = projectLevel(everyFamily).objects;

  it.each(layers.map((layer) => [layer.assetKey, layer] as const))(
    '%s mesure exactement son empreinte à 128 px par unité monde',
    (_asset, layer) => {
      const size = pngSize(publicFile(layer.assetPath));
      const { destination, source } = layer.layer;

      expect(size.height).toBe(Math.round(destination.height * PIXELS_PER_WORLD_UNIT_AT_2X));
      if (source === undefined) {
        expect(size.width).toBe(Math.round(destination.width * PIXELS_PER_WORLD_UNIT_AT_2X));
      } else {
        // A scrolling belt is its window plus one period of pattern to slide over.
        expect(source.width).toBe(Math.round(destination.width * PIXELS_PER_WORLD_UNIT_AT_2X) + 1);
        expect(size.width).toBe(source.width + CONVEYOR_BELT_PERIOD_PX);
      }
    },
  );

  it.each(layers.map((layer) => [layer.assetKey, layer.assetPath] as const))(
    '%s tient dans le budget de 60 Ko',
    (_asset, path) => {
      expect(publicFile(path).byteLength).toBeLessThanOrEqual(SPRITE_BUDGET_BYTES);
    },
  );

  it.each(['ball', 'basket', 'beam', 'seesaw', 'mass', 'lever', 'conveyor'] as const)(
    'fournit une vignette et tous les calques de la famille %s',
    (family) => {
      expect(publicFile(spriteThumbnailPath(family)).byteLength).toBeLessThanOrEqual(
        SPRITE_BUDGET_BYTES,
      );
      for (const asset of spriteAssetsForFamily(family)) {
        expect(publicFile(spriteAssetPath(asset, 2)).byteLength).toBeGreaterThan(0);
      }
    },
  );
});

import { describe, expect, it } from 'vitest';

import { levelDocumentSchema, type LevelDocument } from '../domain/level-document';
import { projectLevel, type BoardViewport } from './board-renderer';
import { hitTestBoard, hitTestRotationHandle } from './board-hit-test';

const viewport: BoardViewport = {
  cssWidth: 320,
  cssHeight: 240,
  origin: { x: 3, y: 2 },
  pixelsPerWorldUnit: 20,
  devicePixelRatio: 1,
};

const createDocument = (objects: LevelDocument['objects']): LevelDocument =>
  levelDocumentSchema.parse({
    schemaVersion: 2,
    id: 'hit-test',
    metadata: { title: 'Hit-test' },
    objects,
    inventory: [],
    goal: { type: 'basket', ballId: 'ball-1', basketId: 'basket-1' },
    buildZones: [],
    scene: { min: { x: 0, y: 0 }, max: { x: 16, y: 9 } },
  });

const beam = (
  id: string,
  position: { readonly x: number; readonly y: number },
  rotation = 0,
): LevelDocument['objects'][number] => ({
  id,
  type: 'beam',
  transform: { position, rotation },
  props: { size: 'medium' },
  permissions: { move: true, rotate: true, remove: true },
});

const ball = (id: string, position: { readonly x: number; readonly y: number }) => ({
  id,
  type: 'ball' as const,
  transform: { position, rotation: 0 },
  props: {},
  permissions: { move: false, rotate: false, remove: false },
});

const basket = (id: string, position: { readonly x: number; readonly y: number }) => ({
  id,
  type: 'basket' as const,
  transform: { position, rotation: 0 },
  props: {},
  permissions: { move: false, rotate: false, remove: false },
});

describe('hit-test pur du plateau', () => {
  it('projette le point en tenant compte de la caméra et de la rotation de l’empreinte', () => {
    const document = createDocument([
      ball('ball-1', { x: 1, y: 1 }),
      basket('basket-1', { x: 2, y: 1 }),
      beam('beam-rotated', { x: 5, y: 4 }, Math.PI / 2),
    ]);

    const objects = projectLevel(document).objects;

    // (5, 4) in world units maps to (40, 40) with this camera. The beam is
    // rotated, so a point 30 CSS px below its centre lies inside its long
    // side; an axis-aligned hit-test would reject it.
    expect(hitTestBoard({ x: 40, y: 70 }, objects, viewport)).toBe('beam-rotated');
    expect(hitTestBoard({ x: 100, y: 70 }, objects, viewport)).toBeNull();
  });

  it('élargit chaque empreinte à une zone tactile minimale de 44 × 44 CSS px', () => {
    const document = createDocument([
      ball('ball-1', { x: 1, y: 1 }),
      basket('basket-1', { x: 2, y: 1 }),
      beam('small-target', { x: 5, y: 4 }),
    ]);

    const objects = projectLevel(document).objects;

    // The medium beam is only 5 CSS px high at this zoom. Its centre is
    // (40, 40), so ±20 CSS px must still be actionable through the expanded
    // touch target, while a point beyond the 44 px target is outside.
    expect(hitTestBoard({ x: 40, y: 60 }, objects, viewport)).toBe('small-target');
    expect(hitTestBoard({ x: 40, y: 63 }, objects, viewport)).toBeNull();
  });

  it('donne la priorité déterministe au dernier objet placé', () => {
    const document = createDocument([
      ball('ball-1', { x: 1, y: 1 }),
      basket('basket-1', { x: 2, y: 1 }),
      beam('first', { x: 5, y: 4 }),
      beam('last', { x: 5, y: 4 }),
    ]);

    expect(hitTestBoard({ x: 40, y: 40 }, projectLevel(document).objects, viewport)).toBe('last');
  });

  it('traite une bascule comme une cible unique', () => {
    const document = createDocument([
      ball('ball-1', { x: 1, y: 1 }),
      basket('basket-1', { x: 2, y: 1 }),
      {
        id: 'seesaw-1',
        type: 'seesaw',
        transform: { position: { x: 7, y: 4 }, rotation: 0 },
        props: {},
        permissions: { move: true, rotate: false, remove: true },
      },
    ]);

    const candidates = projectLevel(document).objects.filter((object) => object.id === 'seesaw-1');
    // Fulcrum and board are two layers of one target sharing the whole footprint.
    expect(candidates.map((candidate) => candidate.destination)).toEqual([
      { x: -1.5, y: -0.12, width: 3, height: 0.82 },
      { x: -1.5, y: -0.12, width: 3, height: 0.82 },
    ]);
    expect(hitTestBoard({ x: 80, y: 40 }, projectLevel(document).objects, viewport)).toBe(
      'seesaw-1',
    );
  });

  it('hit-teste la poignée de rotation à 44 × 44 CSS px séparément de la poutre', () => {
    const document = createDocument([
      ball('ball-1', { x: 1, y: 1 }),
      basket('basket-1', { x: 2, y: 1 }),
      beam('rotatable-beam', { x: 5, y: 4 }),
    ]);
    const selected = projectLevel(document).objects.find(
      (object) => object.id === 'rotatable-beam',
    );
    if (selected === undefined) throw new Error('La poutre sélectionnée est absente.');

    // The beam centre maps to (40, 40); the fixed-distance handle is centred
    // 32 CSS px above it, with a 44 × 44 CSS-pixel hit area.
    expect(hitTestRotationHandle({ x: 40, y: 8 }, selected, viewport)).toBe(true);
    expect(hitTestRotationHandle({ x: 40, y: 40 }, selected, viewport)).toBe(false);
    expect(hitTestRotationHandle({ x: 64, y: 8 }, selected, viewport)).toBe(false);
  });
});

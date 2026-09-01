import { describe, expect, it } from 'vitest';

import { levelDocumentSchema, type LevelDocument } from './level-document';

const validLevel: LevelDocument = {
  schemaVersion: 1,
  id: 'first-drop',
  metadata: {
    title: 'Première chute',
    description: 'La balle tombe dans le panier.',
  },
  objects: [
    {
      id: 'ball-1',
      type: 'ball',
      transform: { position: { x: 0, y: 12 }, rotation: 0 },
      props: {},
      permissions: { move: false, rotate: false, remove: false },
    },
    {
      id: 'basket-1',
      type: 'basket',
      transform: { position: { x: 0, y: 0 }, rotation: 0 },
      props: {},
      permissions: { move: false, rotate: false, remove: false },
    },
    {
      id: 'beam-1',
      type: 'beam',
      transform: { position: { x: -4, y: 4 }, rotation: 0.4 },
      props: { size: 'short' },
      permissions: { move: true, rotate: true, remove: true },
    },
    {
      id: 'seesaw-1',
      type: 'seesaw',
      transform: { position: { x: 5, y: 3 }, rotation: 0 },
      props: {},
      permissions: { move: true, rotate: false, remove: true },
    },
  ],
  inventory: [
    {
      id: 'inventory-beam-medium',
      type: 'beam',
      props: { size: 'medium' },
      quantity: 1,
      permissions: { move: true, rotate: true, remove: true },
    },
  ],
  goal: { type: 'basket', ballId: 'ball-1', basketId: 'basket-1' },
  buildZones: [{ min: { x: -10, y: -2 }, max: { x: 10, y: 15 } }],
};

describe('LevelDocument v1', () => {
  it('accepte les quatre familles et les propriétés discriminées du contrat v1', () => {
    const parsed = levelDocumentSchema.safeParse(validLevel);

    expect(parsed.success).toBe(true);
    if (!parsed.success) return;

    expect(parsed.data).toEqual(validLevel);
    expect(parsed.data.objects.map((placement) => placement.type)).toEqual([
      'ball',
      'basket',
      'beam',
      'seesaw',
    ]);
  });

  it('refuse les champs inconnus et les propriétés qui ne correspondent pas à la famille', () => {
    const candidate: unknown = {
      ...validLevel,
      unexpected: true,
      objects: [
        {
          ...validLevel.objects[2],
          props: { size: 'short', length: 4 },
        },
      ],
    };

    const parsed = levelDocumentSchema.safeParse(candidate);

    expect(parsed.success).toBe(false);
  });

  it('exige des permissions explicites pour les placements et les entrées d’inventaire', () => {
    const candidate: unknown = {
      ...validLevel,
      inventory: [
        {
          ...validLevel.inventory[0],
          permissions: { move: true, rotate: true },
        },
      ],
    };

    const parsed = levelDocumentSchema.safeParse(candidate);

    expect(parsed.success).toBe(false);
  });

  it('refuse les documents qui dépassent les limites numériques techniques', () => {
    const candidate: unknown = {
      ...validLevel,
      objects: [
        {
          ...validLevel.objects[0],
          transform: { position: { x: Number.POSITIVE_INFINITY, y: 12 }, rotation: 0 },
        },
      ],
    };

    const parsed = levelDocumentSchema.safeParse(candidate);

    expect(parsed.success).toBe(false);
  });

  it('refuse les identifiants d’objet dupliqués et les objectifs qui ciblent une mauvaise famille', () => {
    const duplicateObjectId: unknown = {
      ...validLevel,
      objects: [validLevel.objects[0], { ...validLevel.objects[1], id: 'ball-1' }],
    };
    const wrongGoalReference: unknown = {
      ...validLevel,
      goal: { type: 'basket', ballId: 'basket-1', basketId: 'ball-1' },
    };

    expect(levelDocumentSchema.safeParse(duplicateObjectId).success).toBe(false);
    expect(levelDocumentSchema.safeParse(wrongGoalReference).success).toBe(false);
  });

  it('refuse les identifiants d’inventaire dupliqués et une rotation indisponible', () => {
    const duplicateInventoryId: unknown = {
      ...validLevel,
      inventory: [validLevel.inventory[0], validLevel.inventory[0]],
    };
    const unavailableRotation: unknown = {
      ...validLevel,
      objects: [
        validLevel.objects[0],
        {
          ...validLevel.objects[1],
          permissions: { move: false, rotate: true, remove: false },
        },
      ],
    };

    expect(levelDocumentSchema.safeParse(duplicateInventoryId).success).toBe(false);
    expect(levelDocumentSchema.safeParse(unavailableRotation).success).toBe(false);
  });

  it('refuse une zone rectangulaire inversée', () => {
    const candidate: unknown = {
      ...validLevel,
      buildZones: [{ min: { x: 4, y: 0 }, max: { x: 1, y: 3 } }],
    };

    expect(levelDocumentSchema.safeParse(candidate).success).toBe(false);
  });
});

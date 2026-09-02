import { describe, expect, it } from 'vitest';

import {
  levelDocumentSchema,
  levelDocumentV1Schema,
  migrateLevelDocumentV1ToV2,
  type LevelDocument,
  type LevelDocumentV1,
} from './level-document';

const validLevel: LevelDocument = {
  schemaVersion: 2,
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
  scene: { min: { x: -12, y: -4 }, max: { x: 12, y: 17 } },
};

describe('LevelDocument v2', () => {
  it('accepte les quatre familles et les propriétés discriminées du contrat v2', () => {
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

  it('refuse un document schemaVersion 2 sans scene', () => {
    const { scene, ...withoutScene } = validLevel;
    void scene;
    const candidate: unknown = withoutScene;

    const parsed = levelDocumentSchema.safeParse(candidate);

    expect(parsed.success).toBe(false);
    if (parsed.success) return;
    expect(parsed.error.issues.some((issue) => issue.path[0] === 'scene')).toBe(true);
  });

  it('refuse une scène dont la largeur ou la hauteur sort de [4, 64]', () => {
    const tooNarrow: unknown = {
      ...validLevel,
      scene: { min: { x: 0, y: -4 }, max: { x: 3.9, y: 17 } },
    };
    const tooTall: unknown = {
      ...validLevel,
      scene: { min: { x: -12, y: -4 }, max: { x: 12, y: 61 } },
    };

    expect(levelDocumentSchema.safeParse(tooNarrow).success).toBe(false);
    expect(levelDocumentSchema.safeParse(tooTall).success).toBe(false);
  });

  it('refuse une scène dégénérée dont max <= min', () => {
    const degenerateX: unknown = {
      ...validLevel,
      scene: { min: { x: 5, y: -4 }, max: { x: 5, y: 17 } },
    };
    const degenerateY: unknown = {
      ...validLevel,
      scene: { min: { x: -12, y: 10 }, max: { x: 12, y: 4 } },
    };

    expect(levelDocumentSchema.safeParse(degenerateX).success).toBe(false);
    expect(levelDocumentSchema.safeParse(degenerateY).success).toBe(false);
  });

  it('refuse un objet dont le centre est hors scène, avec un chemin d’erreur exploitable', () => {
    const candidate: unknown = {
      ...validLevel,
      objects: [
        { ...validLevel.objects[0], transform: { position: { x: 999, y: 12 }, rotation: 0 } },
        validLevel.objects[1],
        validLevel.objects[2],
        validLevel.objects[3],
      ],
    };

    const parsed = levelDocumentSchema.safeParse(candidate);

    expect(parsed.success).toBe(false);
    if (parsed.success) return;
    expect(parsed.error.issues).toContainEqual(
      expect.objectContaining({ path: ['objects', 0, 'transform', 'position', 'x'] }),
    );
  });

  it('refuse une zone de construction hors scène', () => {
    const candidate: unknown = {
      ...validLevel,
      buildZones: [{ min: { x: -10, y: -2 }, max: { x: 50, y: 15 } }],
    };

    const parsed = levelDocumentSchema.safeParse(candidate);

    expect(parsed.success).toBe(false);
    if (parsed.success) return;
    expect(parsed.error.issues).toContainEqual(
      expect.objectContaining({ path: ['buildZones', 0, 'max', 'x'] }),
    );
  });
});

describe('migrateLevelDocumentV1ToV2', () => {
  const permissions = { move: false, rotate: false, remove: false } as const;

  it('dérive une scène qui contient tous les objets et zones et qui est valide en v2', () => {
    const v1Level: LevelDocumentV1 = {
      schemaVersion: 1,
      id: 'legacy-level',
      metadata: { title: 'Niveau historique' },
      objects: [
        {
          id: 'ball-1',
          type: 'ball',
          transform: { position: { x: -3, y: -2 }, rotation: 0 },
          props: {},
          permissions,
        },
        {
          id: 'basket-1',
          type: 'basket',
          transform: { position: { x: 5, y: 4 }, rotation: 0 },
          props: {},
          permissions,
        },
        {
          id: 'beam-1',
          type: 'beam',
          transform: { position: { x: 0, y: 0 }, rotation: 0 },
          props: { size: 'short' },
          permissions: { move: true, rotate: true, remove: true },
        },
      ],
      inventory: [],
      goal: { type: 'basket', ballId: 'ball-1', basketId: 'basket-1' },
      buildZones: [{ min: { x: -6, y: -5 }, max: { x: 8, y: 7 } }],
    };

    expect(levelDocumentV1Schema.safeParse(v1Level).success).toBe(true);

    const result = migrateLevelDocumentV1ToV2(v1Level);

    expect(result.status).toBe('migrated');
    if (result.status !== 'migrated') return;
    const migrated = result.document;

    expect(migrated.schemaVersion).toBe(2);
    expect(migrated.scene).toEqual({ min: { x: -8, y: -7 }, max: { x: 10, y: 9 } });

    for (const placement of migrated.objects) {
      expect(placement.transform.position.x).toBeGreaterThanOrEqual(migrated.scene.min.x);
      expect(placement.transform.position.x).toBeLessThanOrEqual(migrated.scene.max.x);
      expect(placement.transform.position.y).toBeGreaterThanOrEqual(migrated.scene.min.y);
      expect(placement.transform.position.y).toBeLessThanOrEqual(migrated.scene.max.y);
    }
    for (const zone of migrated.buildZones) {
      expect(zone.min.x).toBeGreaterThanOrEqual(migrated.scene.min.x);
      expect(zone.max.x).toBeLessThanOrEqual(migrated.scene.max.x);
      expect(zone.min.y).toBeGreaterThanOrEqual(migrated.scene.min.y);
      expect(zone.max.y).toBeLessThanOrEqual(migrated.scene.max.y);
    }

    expect(levelDocumentSchema.safeParse(migrated).success).toBe(true);
  });

  it('porte une scène issue d’un groupe compact au minimum de 4 unités de côté', () => {
    const tightV1Level: LevelDocumentV1 = {
      schemaVersion: 1,
      id: 'legacy-tight-cluster',
      metadata: { title: 'Groupe compact' },
      objects: [
        {
          id: 'ball-1',
          type: 'ball',
          transform: { position: { x: 0, y: 0 }, rotation: 0 },
          props: {},
          permissions,
        },
        {
          id: 'basket-1',
          type: 'basket',
          transform: { position: { x: 0.5, y: 0 }, rotation: 0 },
          props: {},
          permissions,
        },
      ],
      inventory: [],
      goal: { type: 'basket', ballId: 'ball-1', basketId: 'basket-1' },
      buildZones: [],
    };

    expect(levelDocumentV1Schema.safeParse(tightV1Level).success).toBe(true);

    const result = migrateLevelDocumentV1ToV2(tightV1Level);

    expect(result.status).toBe('migrated');
    if (result.status !== 'migrated') return;
    const migrated = result.document;

    expect(migrated.scene).toEqual({ min: { x: -2, y: -2 }, max: { x: 2.5, y: 2 } });
    expect(migrated.scene.max.x - migrated.scene.min.x).toBeGreaterThanOrEqual(4);
    expect(migrated.scene.max.y - migrated.scene.min.y).toBeGreaterThanOrEqual(4);
    expect(levelDocumentSchema.safeParse(migrated).success).toBe(true);
  });

  it('échoue explicitement, sans produire de v2, quand l’étalement v1 dépasse la scène maximale', () => {
    const wideV1Level: LevelDocumentV1 = {
      schemaVersion: 1,
      id: 'legacy-wide-spread',
      metadata: { title: 'Étalement large' },
      objects: [
        {
          id: 'ball-1',
          type: 'ball',
          transform: { position: { x: 0, y: 0 }, rotation: 0 },
          props: {},
          permissions,
        },
        {
          id: 'basket-1',
          type: 'basket',
          transform: { position: { x: 100, y: 0 }, rotation: 0 },
          props: {},
          permissions,
        },
      ],
      inventory: [],
      goal: { type: 'basket', ballId: 'ball-1', basketId: 'basket-1' },
      buildZones: [],
    };

    expect(levelDocumentV1Schema.safeParse(wideV1Level).success).toBe(true);

    const result = migrateLevelDocumentV1ToV2(wideV1Level);

    expect(result).toEqual({ status: 'scene-too-large', width: 104, height: 4 });
  });

  it('accepte une scène exactement à la borne haute (64) et refuse de peu au-delà', () => {
    const boundaryV1Level = (basketX: number, id: string): LevelDocumentV1 => ({
      schemaVersion: 1,
      id,
      metadata: { title: 'À la limite' },
      objects: [
        {
          id: 'ball-1',
          type: 'ball',
          transform: { position: { x: 0, y: 0 }, rotation: 0 },
          props: {},
          permissions,
        },
        {
          id: 'basket-1',
          type: 'basket',
          transform: { position: { x: basketX, y: 0 }, rotation: 0 },
          props: {},
          permissions,
        },
      ],
      inventory: [],
      goal: { type: 'basket', ballId: 'ball-1', basketId: 'basket-1' },
      buildZones: [],
    });

    // Raw width 60 + 2 units of margin on each side = 64, the inclusive maximum.
    const atBoundaryResult = migrateLevelDocumentV1ToV2(boundaryV1Level(60, 'legacy-at-boundary'));
    expect(atBoundaryResult.status).toBe('migrated');
    if (atBoundaryResult.status !== 'migrated') return;
    expect(atBoundaryResult.document.scene.max.x - atBoundaryResult.document.scene.min.x).toBe(64);
    expect(levelDocumentSchema.safeParse(atBoundaryResult.document).success).toBe(true);

    const justOverResult = migrateLevelDocumentV1ToV2(boundaryV1Level(60.1, 'legacy-just-over'));
    expect(justOverResult.status).toBe('scene-too-large');
  });

  it.each([
    [
      'niveau ordinaire',
      {
        schemaVersion: 1 as const,
        id: 'invariant-ordinary',
        metadata: { title: 'Ordinaire' },
        objects: [
          {
            id: 'ball-1',
            type: 'ball' as const,
            transform: { position: { x: -3, y: -2 }, rotation: 0 },
            props: {},
            permissions,
          },
          {
            id: 'basket-1',
            type: 'basket' as const,
            transform: { position: { x: 5, y: 4 }, rotation: 0 },
            props: {},
            permissions,
          },
        ],
        inventory: [],
        goal: { type: 'basket' as const, ballId: 'ball-1', basketId: 'basket-1' },
        buildZones: [{ min: { x: -6, y: -5 }, max: { x: 8, y: 7 } }],
      },
    ],
    [
      'groupe compact',
      {
        schemaVersion: 1 as const,
        id: 'invariant-tight',
        metadata: { title: 'Compact' },
        objects: [
          {
            id: 'ball-1',
            type: 'ball' as const,
            transform: { position: { x: 0, y: 0 }, rotation: 0 },
            props: {},
            permissions,
          },
          {
            id: 'basket-1',
            type: 'basket' as const,
            transform: { position: { x: 0.5, y: 0 }, rotation: 0 },
            props: {},
            permissions,
          },
        ],
        inventory: [],
        goal: { type: 'basket' as const, ballId: 'ball-1', basketId: 'basket-1' },
        buildZones: [],
      },
    ],
    [
      'étalement objets bien au-delà de 64',
      {
        schemaVersion: 1 as const,
        id: 'invariant-wide-objects',
        metadata: { title: 'Étalement objets' },
        objects: [
          {
            id: 'ball-1',
            type: 'ball' as const,
            transform: { position: { x: -400, y: 0 }, rotation: 0 },
            props: {},
            permissions,
          },
          {
            id: 'basket-1',
            type: 'basket' as const,
            transform: { position: { x: 400, y: 0 }, rotation: 0 },
            props: {},
            permissions,
          },
        ],
        inventory: [],
        goal: { type: 'basket' as const, ballId: 'ball-1', basketId: 'basket-1' },
        buildZones: [],
      },
    ],
    [
      'étalement porté uniquement par une zone de construction lointaine',
      {
        schemaVersion: 1 as const,
        id: 'invariant-wide-zone',
        metadata: { title: 'Étalement zone' },
        objects: [
          {
            id: 'ball-1',
            type: 'ball' as const,
            transform: { position: { x: 0, y: 0 }, rotation: 0 },
            props: {},
            permissions,
          },
          {
            id: 'basket-1',
            type: 'basket' as const,
            transform: { position: { x: 1, y: 0 }, rotation: 0 },
            props: {},
            permissions,
          },
        ],
        inventory: [],
        goal: { type: 'basket' as const, ballId: 'ball-1', basketId: 'basket-1' },
        buildZones: [{ min: { x: -500, y: -1 }, max: { x: 500, y: 1 } }],
      },
    ],
    [
      'coordonnées proches de la limite technique v1 (±1 000 000)',
      {
        schemaVersion: 1 as const,
        id: 'invariant-extreme',
        metadata: { title: 'Extrême' },
        objects: [
          {
            id: 'ball-1',
            type: 'ball' as const,
            transform: { position: { x: -999_000, y: 0 }, rotation: 0 },
            props: {},
            permissions,
          },
          {
            id: 'basket-1',
            type: 'basket' as const,
            transform: { position: { x: 999_000, y: 0 }, rotation: 0 },
            props: {},
            permissions,
          },
        ],
        inventory: [],
        goal: { type: 'basket' as const, ballId: 'ball-1', basketId: 'basket-1' },
        buildZones: [],
      },
    ],
    [
      'coordonnées négatives groupées',
      {
        schemaVersion: 1 as const,
        id: 'invariant-negative',
        metadata: { title: 'Négatif' },
        objects: [
          {
            id: 'ball-1',
            type: 'ball' as const,
            transform: { position: { x: -20, y: -30 }, rotation: 0 },
            props: {},
            permissions,
          },
          {
            id: 'basket-1',
            type: 'basket' as const,
            transform: { position: { x: -18, y: -28 }, rotation: 0 },
            props: {},
            permissions,
          },
        ],
        inventory: [],
        goal: { type: 'basket' as const, ballId: 'ball-1', basketId: 'basket-1' },
        buildZones: [{ min: { x: -22, y: -32 }, max: { x: -16, y: -26 } }],
      },
    ],
  ])(
    'invariant général (%s) : la migration échoue explicitement ou produit un v2 valide',
    (_label, v1Level) => {
      expect(levelDocumentV1Schema.safeParse(v1Level).success).toBe(true);

      const result = migrateLevelDocumentV1ToV2(v1Level);

      // The whole invariant: never a silent third outcome. Either the
      // migration refuses explicitly, or what it returns is a valid v2
      // document — nothing else is acceptable.
      if (result.status === 'migrated') {
        expect(levelDocumentSchema.safeParse(result.document).success).toBe(true);
      } else {
        expect(result.status).toBe('scene-too-large');
      }
    },
  );
});

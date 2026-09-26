import { z } from 'zod';

import {
  ballPropertiesSchema,
  barrierPropertiesSchema,
  basketPropertiesSchema,
  beamPropertiesSchema,
  buttonPropertiesSchema,
  conveyorPropertiesSchema,
  fanPropertiesSchema,
  leverPropertiesSchema,
  massPropertiesSchema,
  seesawPropertiesSchema,
  springboardPropertiesSchema,
} from './object-family-registry';

/**
 * The current persistent level format (ADR 0007). v1 documents remain
 * readable only through `migrateLevelDocumentV1ToV2`; nothing else accepts
 * them any more.
 */
const LEVEL_DOCUMENT_SCHEMA_VERSION = 2 as const;

/** Legacy schema version, retained solely as migration input. */
const LEVEL_DOCUMENT_V1_SCHEMA_VERSION = 1 as const;

const MAX_IDENTIFIER_LENGTH = 128;
const MAX_TITLE_LENGTH = 160;
const MAX_DESCRIPTION_LENGTH = 2_000;
const MAX_OBJECTS = 512;
const MAX_INVENTORY_ENTRIES = 128;
const MAX_BUILD_ZONES = 64;
const MAX_WIRES = 128;
const MAX_INVENTORY_QUANTITY = 999;
const MAX_CHALLENGE_OBJECT_COUNT = 999;
const MAX_WORLD_COORDINATE = 1_000_000;
const MAX_ROTATION_RADIANS = 100_000;

/** ADR 0007 - Scène d'un niveau: world-unit bounds a scene rectangle must fit within. */
const MIN_SCENE_SIZE = 4;
const MAX_SCENE_SIZE = 64;

/** ADR 0007 / plan A2: margin applied on every side when deriving a v1 document's scene. */
const SCENE_MIGRATION_MARGIN = 2;

const identifierSchema = z
  .string()
  .min(1)
  .max(MAX_IDENTIFIER_LENGTH)
  .regex(/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/, {
    message: 'L’identifiant doit utiliser des lettres minuscules, chiffres ou tirets.',
  });

const finiteWorldCoordinateSchema = z.number().min(-MAX_WORLD_COORDINATE).max(MAX_WORLD_COORDINATE);

const finiteRotationSchema = z.number().min(-MAX_ROTATION_RADIANS).max(MAX_ROTATION_RADIANS);

const worldPositionSchema = z.strictObject({
  x: finiteWorldCoordinateSchema,
  y: finiteWorldCoordinateSchema,
});

const transformSchema = z.strictObject({
  position: worldPositionSchema,
  /** Persisted in radians; rendering pixels and physics handles never enter this value. */
  rotation: finiteRotationSchema,
});

const objectPermissionsSchema = z.strictObject({
  move: z.boolean(),
  rotate: z.boolean(),
  remove: z.boolean(),
});

const placementFields = {
  id: identifierSchema,
  transform: transformSchema,
  permissions: objectPermissionsSchema,
};

const objectPlacementSchema = z.discriminatedUnion('type', [
  z.strictObject({
    ...placementFields,
    type: z.literal('ball'),
    props: ballPropertiesSchema,
  }),
  z.strictObject({
    ...placementFields,
    type: z.literal('basket'),
    props: basketPropertiesSchema,
  }),
  z.strictObject({
    ...placementFields,
    type: z.literal('beam'),
    props: beamPropertiesSchema,
  }),
  z.strictObject({
    ...placementFields,
    type: z.literal('seesaw'),
    props: seesawPropertiesSchema,
  }),
  z.strictObject({
    ...placementFields,
    type: z.literal('mass'),
    props: massPropertiesSchema,
  }),
  z.strictObject({
    ...placementFields,
    type: z.literal('lever'),
    props: leverPropertiesSchema,
  }),
  z.strictObject({
    ...placementFields,
    type: z.literal('conveyor'),
    props: conveyorPropertiesSchema,
  }),
  z.strictObject({
    ...placementFields,
    type: z.literal('button'),
    props: buttonPropertiesSchema,
  }),
  z.strictObject({
    ...placementFields,
    type: z.literal('fan'),
    props: fanPropertiesSchema,
  }),
  z.strictObject({
    ...placementFields,
    type: z.literal('barrier'),
    props: barrierPropertiesSchema,
  }),
  z.strictObject({
    ...placementFields,
    type: z.literal('springboard'),
    props: springboardPropertiesSchema,
  }),
]);

const inventoryFields = {
  id: identifierSchema,
  quantity: z.int().min(0).max(MAX_INVENTORY_QUANTITY),
  permissions: objectPermissionsSchema,
};

const inventoryEntrySchema = z.discriminatedUnion('type', [
  z.strictObject({
    ...inventoryFields,
    type: z.literal('ball'),
    props: ballPropertiesSchema,
  }),
  z.strictObject({
    ...inventoryFields,
    type: z.literal('basket'),
    props: basketPropertiesSchema,
  }),
  z.strictObject({
    ...inventoryFields,
    type: z.literal('beam'),
    props: beamPropertiesSchema,
  }),
  z.strictObject({
    ...inventoryFields,
    type: z.literal('seesaw'),
    props: seesawPropertiesSchema,
  }),
  z.strictObject({
    ...inventoryFields,
    type: z.literal('mass'),
    props: massPropertiesSchema,
  }),
  z.strictObject({
    ...inventoryFields,
    type: z.literal('lever'),
    props: leverPropertiesSchema,
  }),
  z.strictObject({
    ...inventoryFields,
    type: z.literal('conveyor'),
    props: conveyorPropertiesSchema,
  }),
  z.strictObject({
    ...inventoryFields,
    type: z.literal('button'),
    props: buttonPropertiesSchema,
  }),
  z.strictObject({
    ...inventoryFields,
    type: z.literal('fan'),
    props: fanPropertiesSchema,
  }),
  z.strictObject({
    ...inventoryFields,
    type: z.literal('barrier'),
    props: barrierPropertiesSchema,
  }),
  z.strictObject({
    ...inventoryFields,
    type: z.literal('springboard'),
    props: springboardPropertiesSchema,
  }),
]);

/**
 * ADR 0009: a direct link from a controller to a device. Only the relation
 * is stored; route, colour and circuit letter are derived when drawing.
 */
const controlWireSchema = z.strictObject({
  id: identifierSchema,
  sourceId: identifierSchema,
  targetId: identifierSchema,
});

const basketGoalSchema = z.strictObject({
  type: z.literal('basket'),
  ballId: identifierSchema,
  basketId: identifierSchema,
});

const challengeObjectCountSchema = z.int().min(1).max(MAX_CHALLENGE_OBJECT_COUNT);

const challengeSchema = z.strictObject({
  elegantObjectCount: challengeObjectCountSchema,
  minimalObjectCount: challengeObjectCountSchema,
});

const buildZoneSchema = z
  .strictObject({
    min: worldPositionSchema,
    max: worldPositionSchema,
  })
  .superRefine((zone, context) => {
    if (zone.min.x >= zone.max.x) {
      context.addIssue({
        code: 'custom',
        path: ['max', 'x'],
        message: 'La borne maximale x doit être supérieure à la borne minimale x.',
      });
    }

    if (zone.min.y >= zone.max.y) {
      context.addIssue({
        code: 'custom',
        path: ['max', 'y'],
        message: 'La borne maximale y doit être supérieure à la borne minimale y.',
      });
    }
  });

/**
 * ADR 0007 - Scène d'un niveau: the rectangle that frames a level in world
 * units. It drives the initial camera fit, world-exit detection and the
 * background, so it is part of the persistent document rather than a view
 * setting.
 */
const sceneSchema = z
  .strictObject({
    min: worldPositionSchema,
    max: worldPositionSchema,
  })
  .superRefine((scene, context) => {
    if (scene.min.x >= scene.max.x) {
      context.addIssue({
        code: 'custom',
        path: ['max', 'x'],
        message: 'La borne maximale x de la scène doit être supérieure à la borne minimale x.',
      });
    } else {
      const width = scene.max.x - scene.min.x;
      if (width < MIN_SCENE_SIZE || width > MAX_SCENE_SIZE) {
        context.addIssue({
          code: 'custom',
          path: ['max', 'x'],
          message: `La largeur de la scène doit être comprise entre ${String(MIN_SCENE_SIZE)} et ${String(MAX_SCENE_SIZE)} unités monde.`,
        });
      }
    }

    if (scene.min.y >= scene.max.y) {
      context.addIssue({
        code: 'custom',
        path: ['max', 'y'],
        message: 'La borne maximale y de la scène doit être supérieure à la borne minimale y.',
      });
    } else {
      const height = scene.max.y - scene.min.y;
      if (height < MIN_SCENE_SIZE || height > MAX_SCENE_SIZE) {
        context.addIssue({
          code: 'custom',
          path: ['max', 'y'],
          message: `La hauteur de la scène doit être comprise entre ${String(MIN_SCENE_SIZE)} et ${String(MAX_SCENE_SIZE)} unités monde.`,
        });
      }
    }
  });

/** Fields shared by every schema version, independent of `schemaVersion` and `scene`. */
const sharedDocumentFields = {
  id: identifierSchema,
  metadata: z.strictObject({
    title: z.string().min(1).max(MAX_TITLE_LENGTH),
    description: z.string().max(MAX_DESCRIPTION_LENGTH).optional(),
  }),
  objects: z.array(objectPlacementSchema).max(MAX_OBJECTS),
  inventory: z.array(inventoryEntrySchema).max(MAX_INVENTORY_ENTRIES),
  goal: basketGoalSchema,
  buildZones: z.array(buildZoneSchema).max(MAX_BUILD_ZONES),
};

const levelDocumentV1StructureSchema = z.strictObject({
  schemaVersion: z.literal(LEVEL_DOCUMENT_V1_SCHEMA_VERSION),
  ...sharedDocumentFields,
});

const levelDocumentV2StructureSchema = z.strictObject({
  schemaVersion: z.literal(LEVEL_DOCUMENT_SCHEMA_VERSION),
  ...sharedDocumentFields,
  scene: sceneSchema,
  /** Optional on input so that documents written before ADR 0009 stay valid v2. */
  wires: z.array(controlWireSchema).max(MAX_WIRES).default([]),
  /** Optional without a default: absent means that the level has no challenge (ADR 0010). */
  challenge: challengeSchema.optional(),
});

type ObjectPlacement = z.infer<typeof objectPlacementSchema>;
type InventoryEntry = z.infer<typeof inventoryEntrySchema>;
type WorldPosition = z.infer<typeof worldPositionSchema>;
type BuildZone = z.infer<typeof buildZoneSchema>;
type Challenge = z.infer<typeof challengeSchema>;

/** The legacy v1 contract (ADR 0004). Accepted only as migration input. */
export type LevelDocumentV1 = z.infer<typeof levelDocumentV1StructureSchema>;

/** The current v2 contract (ADR 0004, ADR 0007, ADR 0009 and ADR 0010). */
export type LevelDocument = z.infer<typeof levelDocumentV2StructureSchema>;

interface LevelDocumentValidationIssue {
  readonly path: readonly (string | number)[];
  readonly message: string;
}

const addUniqueIdentifierIssues = (
  values: readonly { readonly id: string }[],
  property: 'objects' | 'inventory',
  issues: LevelDocumentValidationIssue[],
): void => {
  const firstIndexesById = new Map<string, number>();

  values.forEach((value, index) => {
    const firstIndex = firstIndexesById.get(value.id);
    if (firstIndex === undefined) {
      firstIndexesById.set(value.id, index);
      return;
    }

    issues.push({
      path: [property, index, 'id'],
      message: `L’identifiant « ${value.id} » est déjà utilisé par ${property}[${String(firstIndex)}].`,
    });
  });
};

/**
 * How a family turns: a beam at any angle, a fan, barrier or springboard by
 * quarter turns (the four directions it can face), anything else never.
 */
export const rotationMode = (type: ObjectPlacement['type']): 'free' | 'quarter-turn' | 'fixed' => {
  if (type === 'beam') return 'free';
  if (type === 'fan' || type === 'barrier' || type === 'springboard') return 'quarter-turn';
  return 'fixed';
};

const QUARTER_TURN = Math.PI / 2;
/** Radians: well under any visible angle, well over the rounding of repeated quarter turns. */
const QUARTER_TURN_TOLERANCE = 1e-6;

const isQuarterTurn = (rotation: number): boolean =>
  Math.abs(rotation / QUARTER_TURN - Math.round(rotation / QUARTER_TURN)) < QUARTER_TURN_TOLERANCE;

const addQuarterTurnIssues = (
  objects: readonly ObjectPlacement[],
  issues: LevelDocumentValidationIssue[],
): void => {
  objects.forEach((placement, index) => {
    if (
      rotationMode(placement.type) === 'quarter-turn' &&
      !isQuarterTurn(placement.transform.rotation)
    ) {
      issues.push({
        path: ['objects', index, 'transform', 'rotation'],
        message: `La famille « ${placement.type} » ne tourne que par quarts de tour.`,
      });
    }
  });
};

const addRotationPermissionIssues = (
  entries: readonly (ObjectPlacement | InventoryEntry)[],
  property: 'objects' | 'inventory',
  issues: LevelDocumentValidationIssue[],
): void => {
  entries.forEach((entry, index) => {
    if (rotationMode(entry.type) === 'fixed' && entry.permissions.rotate) {
      issues.push({
        path: [property, index, 'permissions', 'rotate'],
        message: `La rotation n’est pas disponible pour la famille « ${entry.type} ».`,
      });
    }
  });
};

type ControlWire = z.infer<typeof controlWireSchema>;

type PlacementType = ObjectPlacement['type'];

/**
 * ADR 0009: whether a `source` may command a `target`. Levers and buttons
 * command; conveyors, fans and barriers obey. A button has two states and a
 * conveyor three: a button never commands a conveyor.
 */
export const canCommand = (source: PlacementType, target: PlacementType): boolean => {
  if (source === 'lever') return target === 'conveyor' || target === 'fan' || target === 'barrier';
  if (source === 'button') return target === 'fan' || target === 'barrier';
  return false;
};

const controlSources: ReadonlySet<PlacementType> = new Set(['lever', 'button']);
const controlTargets: ReadonlySet<PlacementType> = new Set(['conveyor', 'fan', 'barrier']);

/**
 * ADR 0009: a wire goes from a placed controller (lever, button) to a placed
 * device (conveyor, fan, barrier) it can command, and a device obeys at
 * most one controller, so that its state is never ambiguous.
 */
const addControlWireIssues = (
  objects: readonly ObjectPlacement[],
  wires: readonly ControlWire[],
  issues: LevelDocumentValidationIssue[],
): void => {
  const placementsById = new Map(objects.map((placement) => [placement.id, placement]));
  const wireIds = new Set<string>();
  const commandedTargets = new Set<string>();

  wires.forEach((wire, index) => {
    if (wireIds.has(wire.id)) {
      issues.push({
        path: ['wires', index, 'id'],
        message: `L’identifiant de fil « ${wire.id} » est déjà utilisé.`,
      });
    }
    wireIds.add(wire.id);

    const source = placementsById.get(wire.sourceId);
    const target = placementsById.get(wire.targetId);
    if (source === undefined || !controlSources.has(source.type)) {
      issues.push({
        path: ['wires', index, 'sourceId'],
        message: 'Un fil doit partir d’un levier ou d’un bouton placé.',
      });
    }
    if (target === undefined || !controlTargets.has(target.type)) {
      issues.push({
        path: ['wires', index, 'targetId'],
        message: 'Un fil doit arriver sur un convoyeur, un ventilateur ou une barrière placés.',
      });
    } else if (
      source !== undefined &&
      controlSources.has(source.type) &&
      !canCommand(source.type, target.type)
    ) {
      issues.push({
        path: ['wires', index, 'targetId'],
        message: 'Un bouton ne commande pas de convoyeur : seul un levier en donne le sens.',
      });
    } else if (commandedTargets.has(wire.targetId)) {
      issues.push({
        path: ['wires', index, 'targetId'],
        message: `L’appareil « ${wire.targetId} » est déjà commandé.`,
      });
    }
    commandedTargets.add(wire.targetId);
  });
};

interface DocumentRelationsInput {
  readonly objects: readonly ObjectPlacement[];
  readonly inventory: readonly InventoryEntry[];
  readonly goal: { readonly ballId: string; readonly basketId: string };
  readonly challenge?: Challenge | undefined;
}

/**
 * Validates relations that cannot be expressed by the structural Zod schemas:
 * identifier uniqueness, the target object references and current object
 * capabilities. Shared by the v1 and v2 schemas.
 */
const addLevelDocumentRelationIssues = (
  document: DocumentRelationsInput,
  issues: LevelDocumentValidationIssue[],
  validateChallengeAgainstInventory = true,
): void => {
  addUniqueIdentifierIssues(document.objects, 'objects', issues);
  addUniqueIdentifierIssues(document.inventory, 'inventory', issues);
  addRotationPermissionIssues(document.objects, 'objects', issues);
  addRotationPermissionIssues(document.inventory, 'inventory', issues);

  const placementsById = new Map(document.objects.map((placement) => [placement.id, placement]));
  const ball = placementsById.get(document.goal.ballId);
  if (ball?.type !== 'ball') {
    issues.push({
      path: ['goal', 'ballId'],
      message: 'L’objectif doit référencer une balle déjà placée.',
    });
  }

  const basket = placementsById.get(document.goal.basketId);
  if (basket?.type !== 'basket') {
    issues.push({
      path: ['goal', 'basketId'],
      message: 'L’objectif doit référencer un panier déjà placé.',
    });
  }

  if (document.challenge !== undefined) {
    const { elegantObjectCount, minimalObjectCount } = document.challenge;
    if (minimalObjectCount > elegantObjectCount) {
      issues.push({
        path: ['challenge', 'minimalObjectCount'],
        message: 'Le nombre minimal connu ne peut pas dépasser le seuil élégant.',
      });
    }

    const inventoryObjectCount = document.inventory.reduce(
      (total, entry) => total + entry.quantity,
      0,
    );
    if (validateChallengeAgainstInventory && minimalObjectCount > inventoryObjectCount) {
      issues.push({
        path: ['challenge', 'minimalObjectCount'],
        message: 'Le nombre minimal connu ne peut pas dépasser la quantité totale de l’inventaire.',
      });
    }
  }
};

interface SceneContainmentInput {
  readonly scene: { readonly min: WorldPosition; readonly max: WorldPosition };
  readonly objects: readonly ObjectPlacement[];
  readonly buildZones: readonly BuildZone[];
}

/**
 * ADR 0007: every placed object's centre and every build zone must be
 * contained in the scene. Full-shape containment for objects is a known debt
 * (see `docs/backlog.md` § Dettes transverses) because object dimensions are
 * not yet part of the domain.
 */
const addSceneContainmentIssues = (
  document: SceneContainmentInput,
  issues: LevelDocumentValidationIssue[],
): void => {
  document.objects.forEach((placement, index) => {
    const { x, y } = placement.transform.position;
    if (x < document.scene.min.x || x > document.scene.max.x) {
      issues.push({
        path: ['objects', index, 'transform', 'position', 'x'],
        message: `Le centre de l’objet « ${placement.id} » doit être contenu dans la scène sur l’axe x.`,
      });
    }
    if (y < document.scene.min.y || y > document.scene.max.y) {
      issues.push({
        path: ['objects', index, 'transform', 'position', 'y'],
        message: `Le centre de l’objet « ${placement.id} » doit être contenu dans la scène sur l’axe y.`,
      });
    }
  });

  document.buildZones.forEach((zone, index) => {
    if (zone.min.x < document.scene.min.x) {
      issues.push({
        path: ['buildZones', index, 'min', 'x'],
        message: 'La zone de construction doit être contenue dans la scène sur l’axe x.',
      });
    }
    if (zone.max.x > document.scene.max.x) {
      issues.push({
        path: ['buildZones', index, 'max', 'x'],
        message: 'La zone de construction doit être contenue dans la scène sur l’axe x.',
      });
    }
    if (zone.min.y < document.scene.min.y) {
      issues.push({
        path: ['buildZones', index, 'min', 'y'],
        message: 'La zone de construction doit être contenue dans la scène sur l’axe y.',
      });
    }
    if (zone.max.y > document.scene.max.y) {
      issues.push({
        path: ['buildZones', index, 'max', 'y'],
        message: 'La zone de construction doit être contenue dans la scène sur l’axe y.',
      });
    }
  });
};

/** Legacy v1 contract (ADR 0004), accepted only as `migrateLevelDocumentV1ToV2` input. */
export const levelDocumentV1Schema = levelDocumentV1StructureSchema.superRefine(
  (document, context) => {
    const issues: LevelDocumentValidationIssue[] = [];
    addLevelDocumentRelationIssues(document, issues);
    for (const issue of issues) {
      context.addIssue({ code: 'custom', path: [...issue.path], message: issue.message });
    }
  },
);

/** The current v2 contract (ADR 0004, ADR 0007, ADR 0009 and ADR 0010). */
export const levelDocumentSchema = levelDocumentV2StructureSchema.superRefine(
  (document, context) => {
    const issues: LevelDocumentValidationIssue[] = [];
    addLevelDocumentRelationIssues(document, issues);
    addSceneContainmentIssues(document, issues);
    addQuarterTurnIssues(document.objects, issues);
    addControlWireIssues(document.objects, document.wires, issues);
    for (const issue of issues) {
      context.addIssue({ code: 'custom', path: [...issue.path], message: issue.message });
    }
  },
);

/**
 * Construction attempts expose remaining inventory in their document while
 * the challenge is defined against the original stock. Use this schema only
 * for that ephemeral projection; `ConstructionAttempt` separately restores
 * quantities from validated provenance before accepting a candidate.
 */
export const levelDocumentAttemptSchema = levelDocumentV2StructureSchema.superRefine(
  (document, context) => {
    const issues: LevelDocumentValidationIssue[] = [];
    addLevelDocumentRelationIssues(document, issues, false);
    addSceneContainmentIssues(document, issues);
    addQuarterTurnIssues(document.objects, issues);
    addControlWireIssues(document.objects, document.wires, issues);
    for (const issue of issues) {
      context.addIssue({ code: 'custom', path: [...issue.path], message: issue.message });
    }
  },
);

/**
 * Outcome of `migrateLevelDocumentV1ToV2`.
 *
 * ADR 0007 fixes the scene at [`MIN_SCENE_SIZE`, `MAX_SCENE_SIZE`] world
 * units per side, but v1 allowed coordinates up to ±1 000 000: a
 * perfectly valid v1 document can have a bounding box wider or taller than
 * the migration is able to represent (e.g. a ball and a basket 100 units
 * apart). Clamping the scene to `MAX_SCENE_SIZE` in that case would leave
 * some objects outside the declared rectangle, which is exactly the
 * invariant `levelDocumentSchema` exists to reject — the v2 document would
 * still fail validation, just later and less legibly. So this case is
 * surfaced explicitly instead of silently producing an invalid v2 document.
 *
 * It is modelled as a typed result rather than a thrown exception: this
 * mirrors how the rest of this codebase expresses expected, recoverable
 * failures (`ConstructionCommandOutcome`, `ContentCatalogValidationResult`),
 * keeps the function total and easy to test without `try`/`catch`, and
 * forces a caller to handle the failure at the type level instead of being
 * able to forget it.
 */
type LevelDocumentMigrationResult =
  | { readonly status: 'migrated'; readonly document: LevelDocument }
  | {
      readonly status: 'scene-too-large';
      readonly width: number;
      readonly height: number;
    };

/**
 * ADR 0007: derives the scene rectangle a pre-scene v1 document never had.
 * The scene is the bounding box of every object centre and build-zone corner,
 * widened by `SCENE_MIGRATION_MARGIN` units on every side, then widened
 * further so that no side is smaller than `MIN_SCENE_SIZE`. If the result is
 * still wider or taller than `MAX_SCENE_SIZE`, the migration fails explicitly
 * (see `LevelDocumentMigrationResult`) instead of returning a document that
 * `levelDocumentSchema` would reject. Pure: it neither mutates its input nor
 * performs I/O.
 */
export const migrateLevelDocumentV1ToV2 = (
  document: LevelDocumentV1,
): LevelDocumentMigrationResult => {
  const points: WorldPosition[] = [
    ...document.objects.map((placement) => placement.transform.position),
    ...document.buildZones.flatMap((zone) => [zone.min, zone.max]),
  ];

  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);

  // A v1 document valid under `levelDocumentV1Schema` always places at least a
  // ball and a basket (the goal references require it), so `points` is never
  // empty in practice; the fallback only guards a document built by hand.
  const rawMinX = xs.length > 0 ? Math.min(...xs) : -MIN_SCENE_SIZE / 2;
  const rawMaxX = xs.length > 0 ? Math.max(...xs) : MIN_SCENE_SIZE / 2;
  const rawMinY = ys.length > 0 ? Math.min(...ys) : -MIN_SCENE_SIZE / 2;
  const rawMaxY = ys.length > 0 ? Math.max(...ys) : MIN_SCENE_SIZE / 2;

  const widenToMinimumSize = (rawMin: number, rawMax: number): { min: number; max: number } => {
    const min = rawMin - SCENE_MIGRATION_MARGIN;
    const max = rawMax + SCENE_MIGRATION_MARGIN;
    if (max - min >= MIN_SCENE_SIZE) return { min, max };

    const center = (min + max) / 2;
    return { min: center - MIN_SCENE_SIZE / 2, max: center + MIN_SCENE_SIZE / 2 };
  };

  const xRange = widenToMinimumSize(rawMinX, rawMaxX);
  const yRange = widenToMinimumSize(rawMinY, rawMaxY);
  const width = xRange.max - xRange.min;
  const height = yRange.max - yRange.min;

  if (width > MAX_SCENE_SIZE || height > MAX_SCENE_SIZE) {
    return { status: 'scene-too-large', width, height };
  }

  return {
    status: 'migrated',
    document: {
      ...document,
      schemaVersion: LEVEL_DOCUMENT_SCHEMA_VERSION,
      wires: [],
      scene: {
        min: { x: xRange.min, y: yRange.min },
        max: { x: xRange.max, y: yRange.max },
      },
    },
  };
};

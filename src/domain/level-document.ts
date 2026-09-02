import { z } from 'zod';

import {
  ballPropertiesSchema,
  basketPropertiesSchema,
  beamPropertiesSchema,
  seesawPropertiesSchema,
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
const MAX_INVENTORY_QUANTITY = 999;
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
]);

const basketGoalSchema = z.strictObject({
  type: z.literal('basket'),
  ballId: identifierSchema,
  basketId: identifierSchema,
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
});

type ObjectPlacement = z.infer<typeof objectPlacementSchema>;
type InventoryEntry = z.infer<typeof inventoryEntrySchema>;
type WorldPosition = z.infer<typeof worldPositionSchema>;
type BuildZone = z.infer<typeof buildZoneSchema>;

/** The legacy v1 contract (ADR 0004). Accepted only as migration input. */
export type LevelDocumentV1 = z.infer<typeof levelDocumentV1StructureSchema>;

/** The current v2 contract (ADR 0004 + ADR 0007). */
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

const addRotationPermissionIssues = (
  entries: readonly (ObjectPlacement | InventoryEntry)[],
  property: 'objects' | 'inventory',
  issues: LevelDocumentValidationIssue[],
): void => {
  entries.forEach((entry, index) => {
    if (entry.type !== 'beam' && entry.permissions.rotate) {
      issues.push({
        path: [property, index, 'permissions', 'rotate'],
        message: `La rotation n’est pas disponible pour la famille « ${entry.type} ».`,
      });
    }
  });
};

interface DocumentRelationsInput {
  readonly objects: readonly ObjectPlacement[];
  readonly inventory: readonly InventoryEntry[];
  readonly goal: { readonly ballId: string; readonly basketId: string };
}

/**
 * Validates relations that cannot be expressed by the structural Zod schemas:
 * identifier uniqueness, the target object references and current object
 * capabilities. Shared by the v1 and v2 schemas.
 */
const addLevelDocumentRelationIssues = (
  document: DocumentRelationsInput,
  issues: LevelDocumentValidationIssue[],
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

/** The current v2 contract (ADR 0004 + ADR 0007). */
export const levelDocumentSchema = levelDocumentV2StructureSchema.superRefine(
  (document, context) => {
    const issues: LevelDocumentValidationIssue[] = [];
    addLevelDocumentRelationIssues(document, issues);
    addSceneContainmentIssues(document, issues);
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
export type LevelDocumentMigrationResult =
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
      scene: {
        min: { x: xRange.min, y: yRange.min },
        max: { x: xRange.max, y: yRange.max },
      },
    },
  };
};

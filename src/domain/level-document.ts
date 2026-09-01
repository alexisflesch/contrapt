import { z } from 'zod';

import {
  ballPropertiesSchema,
  basketPropertiesSchema,
  beamPropertiesSchema,
  seesawPropertiesSchema,
} from './object-family-registry';

/** The only persistent level format accepted by the initial release. */
const LEVEL_DOCUMENT_SCHEMA_VERSION = 1 as const;

const MAX_IDENTIFIER_LENGTH = 128;
const MAX_TITLE_LENGTH = 160;
const MAX_DESCRIPTION_LENGTH = 2_000;
const MAX_OBJECTS = 512;
const MAX_INVENTORY_ENTRIES = 128;
const MAX_BUILD_ZONES = 64;
const MAX_INVENTORY_QUANTITY = 999;
const MAX_WORLD_COORDINATE = 1_000_000;
const MAX_ROTATION_RADIANS = 100_000;

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

const levelDocumentStructureSchema = z.strictObject({
  schemaVersion: z.literal(LEVEL_DOCUMENT_SCHEMA_VERSION),
  id: identifierSchema,
  metadata: z.strictObject({
    title: z.string().min(1).max(MAX_TITLE_LENGTH),
    description: z.string().max(MAX_DESCRIPTION_LENGTH).optional(),
  }),
  objects: z.array(objectPlacementSchema).max(MAX_OBJECTS),
  inventory: z.array(inventoryEntrySchema).max(MAX_INVENTORY_ENTRIES),
  goal: basketGoalSchema,
  buildZones: z.array(buildZoneSchema).max(MAX_BUILD_ZONES),
});

type ObjectPlacement = z.infer<typeof objectPlacementSchema>;
type InventoryEntry = z.infer<typeof inventoryEntrySchema>;
export type LevelDocument = z.infer<typeof levelDocumentStructureSchema>;

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
        message: `La rotation n’est pas disponible pour la famille « ${entry.type} » en v1.`,
      });
    }
  });
};

/**
 * Validates relations that cannot be expressed by the structural Zod schemas:
 * identifier uniqueness, the target object references and current object capabilities.
 */
const validateLevelDocument = (
  document: LevelDocument,
): readonly LevelDocumentValidationIssue[] => {
  const issues: LevelDocumentValidationIssue[] = [];
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

  return issues;
};

export const levelDocumentSchema = levelDocumentStructureSchema.superRefine((document, context) => {
  for (const issue of validateLevelDocument(document)) {
    context.addIssue({
      code: 'custom',
      path: [...issue.path],
      message: issue.message,
    });
  }
});

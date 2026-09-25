import { z } from 'zod';

export const ballPropertiesSchema = z.strictObject({});
export const basketPropertiesSchema = z.strictObject({});
export const beamPropertiesSchema = z.strictObject({
  size: z.enum(['short', 'medium', 'long']),
});
export const seesawPropertiesSchema = z.strictObject({});
/** One sprite and one physical mass per weight; a new weight extends the enum. */
export const massPropertiesSchema = z.strictObject({
  weight: z.enum(['10kg']),
});
/** Where the handle stands when the simulation starts; objects may push it afterwards. */
export const leverPropertiesSchema = z.strictObject({
  position: z.enum(['left', 'center', 'right']),
});
/** The belt's direction when no lever commands it (ADR 0009). */
export const conveyorPropertiesSchema = z.strictObject({
  direction: z.enum(['left', 'stopped', 'right']),
});

type ObjectFamilyCapability = 'movable' | 'rotatable' | 'sensor' | 'sized';

export interface ObjectFamilyDefinition {
  readonly id: string;
  readonly dataVersion: number;
  readonly catalogue: {
    readonly label: string;
    readonly description: string;
  };
  readonly capabilities: readonly ObjectFamilyCapability[];
  readonly propertiesSchema: z.ZodType;
}

interface ObjectFamilyRegistry {
  readonly definitions: readonly ObjectFamilyDefinition[];
  readonly get: (id: string) => ObjectFamilyDefinition | undefined;
}

const capabilitySchema = z.enum(['movable', 'rotatable', 'sensor', 'sized']);

const objectFamilyDefinitionSchema = z
  .strictObject({
    id: z
      .string()
      .min(1)
      .regex(/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/),
    dataVersion: z.int().positive(),
    catalogue: z.strictObject({
      label: z.string().min(1),
      description: z.string().min(1),
    }),
    capabilities: z.array(capabilitySchema),
    propertiesSchema: z.custom<z.ZodType>((value) => value instanceof z.ZodType),
  })
  .superRefine((definition, context) => {
    const seenCapabilities = new Set<ObjectFamilyCapability>();
    definition.capabilities.forEach((capability, index) => {
      if (seenCapabilities.has(capability)) {
        context.addIssue({
          code: 'custom',
          path: ['capabilities', index],
          message: `La capacité « ${capability} » est déjà déclarée.`,
        });
      }
      seenCapabilities.add(capability);
    });
  });

/**
 * Builds the compile-time family registry after validating every definition.
 * Runtime physics and presentation concerns deliberately stay outside this contract.
 */
export const createObjectFamilyRegistry = (
  definitions: readonly ObjectFamilyDefinition[],
): ObjectFamilyRegistry => {
  definitions.forEach((definition) => objectFamilyDefinitionSchema.parse(definition));

  const definitionsById = new Map<string, ObjectFamilyDefinition>();
  for (const definition of definitions) {
    if (definitionsById.has(definition.id)) {
      throw new Error(`La famille d’objet « ${definition.id} » est déjà enregistrée.`);
    }
    definitionsById.set(definition.id, definition);
  }

  return {
    definitions: Object.freeze([...definitions]),
    get: (id) => definitionsById.get(id),
  };
};

export const initialObjectFamilyRegistry = createObjectFamilyRegistry([
  {
    id: 'ball',
    dataVersion: 1,
    catalogue: {
      label: 'Balle',
      description: 'Un corps libre entraîné par la gravité',
    },
    capabilities: ['movable'],
    propertiesSchema: ballPropertiesSchema,
  },
  {
    id: 'basket',
    dataVersion: 1,
    catalogue: {
      label: 'Panier',
      description: 'La cible finale de la scène',
    },
    capabilities: ['movable', 'sensor'],
    propertiesSchema: basketPropertiesSchema,
  },
  {
    id: 'beam',
    dataVersion: 1,
    catalogue: {
      label: 'Poutre',
      description: 'Trois longueurs pour guider la balle',
    },
    capabilities: ['movable', 'rotatable', 'sized'],
    propertiesSchema: beamPropertiesSchema,
  },
  {
    id: 'seesaw',
    dataVersion: 1,
    catalogue: {
      label: 'Bascule',
      description: 'Une bascule préassemblée',
    },
    capabilities: ['movable'],
    propertiesSchema: seesawPropertiesSchema,
  },
  {
    id: 'mass',
    dataVersion: 1,
    catalogue: {
      label: 'Masse',
      description: 'Un poids lourd qui fait basculer',
    },
    capabilities: ['movable'],
    propertiesSchema: massPropertiesSchema,
  },
  {
    id: 'lever',
    dataVersion: 1,
    catalogue: {
      label: 'Levier',
      description: 'Commande un convoyeur : gauche, arrêt, droite',
    },
    capabilities: ['movable'],
    propertiesSchema: leverPropertiesSchema,
  },
  {
    id: 'conveyor',
    dataVersion: 1,
    catalogue: {
      label: 'Convoyeur',
      description: 'Un tapis qui entraîne ce qu’il porte',
    },
    capabilities: ['movable'],
    propertiesSchema: conveyorPropertiesSchema,
  },
]);

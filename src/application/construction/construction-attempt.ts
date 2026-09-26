import { initialObjectFamilyRegistry } from '../../domain/object-family-registry';
import { placementFootprintCorners } from '../../domain/placement-footprint';
import {
  levelDocumentAttemptSchema,
  levelDocumentSchema,
  rotationMode,
  type LevelDocument,
} from '../../domain/level-document';
import type { Command, CommandState } from '../history';

export type ConstructionContext = 'player' | 'author';

export type ConstructionErrorCode =
  | 'inventory-entry-not-found'
  | 'inventory-depleted'
  | 'placement-id-already-used'
  | 'placement-not-found'
  | 'placement-not-rotatable'
  | 'move-not-permitted'
  | 'rotate-not-permitted'
  | 'remove-not-permitted'
  | 'outside-build-zone'
  | 'goal-object-protected'
  | 'inventory-provenance-missing'
  | 'inventory-source-not-found'
  | 'inventory-provenance-mismatch'
  | 'properties-not-permitted'
  | 'wiring-not-permitted'
  | 'wire-already-connected'
  | 'wire-not-found'
  | 'invalid-level-document';

/**
 * State for one editable construction. Provenance deliberately lives beside the
 * persistent document: it describes this attempt, not the authored level.
 */
export interface ConstructionAttempt {
  readonly document: LevelDocument;
  readonly provenance: Readonly<Record<string, string>>;
}

type ConstructionCommandOutcome =
  | { readonly status: 'accepted'; readonly state: ConstructionAttempt }
  | { readonly status: 'rejected'; readonly reason: ConstructionErrorCode };

interface ConstructionCommand extends Command<ConstructionAttempt> {
  readonly execute: (state: CommandState<ConstructionAttempt>) => ConstructionCommandOutcome;
}

type Placement = LevelDocument['objects'][number];
type InventoryEntry = LevelDocument['inventory'][number];
type Transform = Placement['transform'];
type WorldPosition = Transform['position'];

interface PlaceFromInventoryInput {
  readonly context: ConstructionContext;
  readonly inventoryEntryId: string;
  readonly placementId: string;
  readonly transform: Transform;
}

interface MovePlacementInput {
  readonly context: ConstructionContext;
  readonly placementId: string;
  readonly position: WorldPosition;
}

interface RotatePlacementInput {
  readonly context: ConstructionContext;
  readonly placementId: string;
  readonly rotation: number;
}

interface RemovePlacementInput {
  readonly context: ConstructionContext;
  readonly placementId: string;
}

/**
 * Persistent properties are author-only: a beam's size, a lever's starting
 * position, a conveyor's direction. They are checked against the schema of
 * the placement's own family.
 */
interface UpdatePlacementPropertiesInput {
  readonly context: ConstructionContext;
  readonly placementId: string;
  readonly props: Placement['props'];
}

/** Wiring is an authoring act in v1 (ADR 0009): the player never edits circuits. */
interface ConnectControlWireInput {
  readonly context: ConstructionContext;
  readonly wireId: string;
  readonly sourceId: string;
  readonly targetId: string;
}

interface DisconnectControlWireInput {
  readonly context: ConstructionContext;
  readonly wireId: string;
}

const deepFreeze = <Value>(value: Value): Value => {
  const visited = new WeakSet();

  const freeze = (candidate: unknown): void => {
    if (typeof candidate !== 'object' || candidate === null || visited.has(candidate)) return;

    visited.add(candidate);
    Object.values(candidate).forEach(freeze);
    Object.freeze(candidate);
  };

  freeze(value);
  return value;
};

const freezeAttempt = (
  document: LevelDocument,
  provenance: Readonly<Record<string, string>>,
): ConstructionAttempt => deepFreeze({ document, provenance: { ...provenance } });

export const createConstructionAttempt = (document: LevelDocument): ConstructionAttempt =>
  freezeAttempt(levelDocumentSchema.parse(document), {});

const reject = (reason: ConstructionErrorCode): ConstructionCommandOutcome => ({
  status: 'rejected',
  reason,
});

const coordinateTolerance = (left: number, right: number): number =>
  Number.EPSILON * 16 * Math.max(1, Math.abs(left), Math.abs(right));

const isCoordinateInside = (value: number, min: number, max: number): boolean =>
  value + coordinateTolerance(value, min) >= min && value - coordinateTolerance(value, max) <= max;

/** A full object footprint must fit in one build zone; shared edges are inclusive. */
const isFootprintInsideBuildZone = (
  document: LevelDocument,
  corners: ReturnType<typeof placementFootprintCorners>,
): boolean =>
  document.buildZones.some(({ min, max }) =>
    corners.every(
      ({ x, y }) => isCoordinateInside(x, min.x, max.x) && isCoordinateInside(y, min.y, max.y),
    ),
  );

/** Properties are flat objects of strings, so comparing their entries is exact. */
const samePropertyValues = (
  left: Readonly<Record<string, unknown>>,
  right: Readonly<Record<string, unknown>>,
): boolean =>
  Object.keys(left).length === Object.keys(right).length &&
  Object.entries(left).every(([key, value]) => right[key] === value);

const definitionsMatch = (placement: Placement, inventoryEntry: InventoryEntry): boolean => {
  if (placement.type !== inventoryEntry.type) return false;

  const propertiesMatch = samePropertyValues(placement.props, inventoryEntry.props);

  return (
    propertiesMatch &&
    placement.permissions.move === inventoryEntry.permissions.move &&
    placement.permissions.rotate === inventoryEntry.permissions.rotate &&
    placement.permissions.remove === inventoryEntry.permissions.remove
  );
};

const acceptCandidate = (
  documentCandidate: unknown,
  provenance: Readonly<Record<string, string>>,
): ConstructionCommandOutcome => {
  const attemptValidation = levelDocumentAttemptSchema.safeParse(documentCandidate);
  if (!attemptValidation.success) return reject('invalid-level-document');
  const attemptDocument = attemptValidation.data;
  const placementsById = new Map(
    attemptDocument.objects.map((placement) => [placement.id, placement]),
  );
  const consumedByInventoryId = new Map<string, number>();

  for (const [placementId, inventoryEntryId] of Object.entries(provenance)) {
    const placement = placementsById.get(placementId);
    const inventoryEntry = attemptDocument.inventory.find(({ id }) => id === inventoryEntryId);
    if (placement === undefined || inventoryEntry === undefined) continue;
    if (!definitionsMatch(placement, inventoryEntry)) continue;
    consumedByInventoryId.set(
      inventoryEntryId,
      (consumedByInventoryId.get(inventoryEntryId) ?? 0) + 1,
    );
  }

  // A player attempt stores remaining quantities in its document, while the
  // challenge invariant is defined against the level's original inventory.
  // Reconstruct that inventory for validation, then retain the remaining
  // quantities in the accepted attempt for the drawer and depletion checks.
  const inventoryForValidation = attemptDocument.inventory.map((entry) => ({
    ...entry,
    quantity: entry.quantity + (consumedByInventoryId.get(entry.id) ?? 0),
  }));
  const validation = levelDocumentSchema.safeParse({
    ...attemptDocument,
    inventory: inventoryForValidation,
  });
  if (!validation.success) return reject('invalid-level-document');

  return {
    status: 'accepted',
    state: freezeAttempt({ ...validation.data, inventory: attemptDocument.inventory }, provenance),
  };
};

export const placeFromInventory = (input: PlaceFromInventoryInput): ConstructionCommand => ({
  execute: (state) => {
    const inventoryEntry = state.document.inventory.find(({ id }) => id === input.inventoryEntryId);
    if (inventoryEntry === undefined) return reject('inventory-entry-not-found');
    if (inventoryEntry.quantity <= 0) return reject('inventory-depleted');
    if (state.document.objects.some(({ id }) => id === input.placementId)) {
      return reject('placement-id-already-used');
    }
    if (
      input.context === 'player' &&
      !isFootprintInsideBuildZone(
        state.document,
        placementFootprintCorners(inventoryEntry, input.transform),
      )
    ) {
      return reject('outside-build-zone');
    }

    const placementCandidate = {
      id: input.placementId,
      type: inventoryEntry.type,
      props: { ...inventoryEntry.props },
      transform: {
        position: { ...input.transform.position },
        rotation: input.transform.rotation,
      },
      permissions: { ...inventoryEntry.permissions },
    };
    const documentCandidate = {
      ...state.document,
      objects: [...state.document.objects, placementCandidate],
      inventory: state.document.inventory.map((entry) =>
        entry.id === inventoryEntry.id ? { ...entry, quantity: entry.quantity - 1 } : entry,
      ),
    };

    return acceptCandidate(documentCandidate, {
      ...state.provenance,
      [input.placementId]: inventoryEntry.id,
    });
  },
});

export const movePlacement = (input: MovePlacementInput): ConstructionCommand => ({
  execute: (state) => {
    const placement = state.document.objects.find(({ id }) => id === input.placementId);
    if (placement === undefined) return reject('placement-not-found');
    if (input.context === 'player' && !placement.permissions.move) {
      return reject('move-not-permitted');
    }
    if (
      input.context === 'player' &&
      !isFootprintInsideBuildZone(
        state.document,
        placementFootprintCorners(placement, {
          ...placement.transform,
          position: input.position,
        }),
      )
    ) {
      return reject('outside-build-zone');
    }
    if (
      placement.transform.position.x === input.position.x &&
      placement.transform.position.y === input.position.y
    ) {
      return { status: 'accepted', state };
    }

    const documentCandidate = {
      ...state.document,
      objects: state.document.objects.map((entry) =>
        entry.id === placement.id
          ? {
              ...entry,
              transform: { ...entry.transform, position: { ...input.position } },
            }
          : entry,
      ),
    };
    return acceptCandidate(documentCandidate, state.provenance);
  },
});

export const rotatePlacement = (input: RotatePlacementInput): ConstructionCommand => ({
  execute: (state) => {
    const placement = state.document.objects.find(({ id }) => id === input.placementId);
    if (placement === undefined) return reject('placement-not-found');
    if (rotationMode(placement.type) === 'fixed') return reject('placement-not-rotatable');
    if (input.context === 'player' && !placement.permissions.rotate) {
      return reject('rotate-not-permitted');
    }
    if (
      input.context === 'player' &&
      !isFootprintInsideBuildZone(
        state.document,
        placementFootprintCorners(placement, {
          ...placement.transform,
          rotation: input.rotation,
        }),
      )
    ) {
      return reject('outside-build-zone');
    }
    if (placement.transform.rotation === input.rotation) {
      return { status: 'accepted', state };
    }

    const documentCandidate = {
      ...state.document,
      objects: state.document.objects.map((entry) =>
        entry.id === placement.id
          ? { ...entry, transform: { ...entry.transform, rotation: input.rotation } }
          : entry,
      ),
    };
    return acceptCandidate(documentCandidate, state.provenance);
  },
});

export const updatePlacementProperties = (
  input: UpdatePlacementPropertiesInput,
): ConstructionCommand => ({
  execute: (state) => {
    if (input.context === 'player') return reject('properties-not-permitted');

    const placement = state.document.objects.find(({ id }) => id === input.placementId);
    if (placement === undefined) return reject('placement-not-found');

    const family = initialObjectFamilyRegistry.get(placement.type);
    const properties = family?.propertiesSchema.safeParse(input.props);
    if (properties?.success !== true) return reject('invalid-level-document');

    if (samePropertyValues(placement.props, input.props)) {
      return { status: 'accepted', state };
    }

    const documentCandidate = {
      ...state.document,
      objects: state.document.objects.map((entry) =>
        entry.id === placement.id ? { ...entry, props: properties.data } : entry,
      ),
    };
    return acceptCandidate(documentCandidate, state.provenance);
  },
});

export const removePlacement = (input: RemovePlacementInput): ConstructionCommand => ({
  execute: (state) => {
    const placement = state.document.objects.find(({ id }) => id === input.placementId);
    if (placement === undefined) return reject('placement-not-found');
    if (
      placement.id === state.document.goal.ballId ||
      placement.id === state.document.goal.basketId
    ) {
      return reject('goal-object-protected');
    }
    if (input.context === 'player' && !placement.permissions.remove) {
      return reject('remove-not-permitted');
    }

    const sourceId = state.provenance[placement.id];
    if (input.context === 'player' && sourceId === undefined) {
      return reject('inventory-provenance-missing');
    }

    let inventoryCandidate: unknown = state.document.inventory;
    if (sourceId !== undefined) {
      const source = state.document.inventory.find(({ id }) => id === sourceId);
      if (source === undefined) return reject('inventory-source-not-found');
      if (input.context === 'player' && !definitionsMatch(placement, source)) {
        return reject('inventory-provenance-mismatch');
      }

      inventoryCandidate = state.document.inventory.map((entry) =>
        entry.id === source.id ? { ...entry, quantity: entry.quantity + 1 } : entry,
      );
    }

    const documentCandidate = {
      ...state.document,
      objects: state.document.objects.filter(({ id }) => id !== placement.id),
      inventory: inventoryCandidate,
      // A wire never outlives either of its ends.
      wires: state.document.wires.filter(
        ({ sourceId, targetId }) => sourceId !== placement.id && targetId !== placement.id,
      ),
    };
    const provenance = Object.fromEntries(
      Object.entries(state.provenance).filter(([placementId]) => placementId !== placement.id),
    );
    return acceptCandidate(documentCandidate, provenance);
  },
});

export const connectControlWire = (input: ConnectControlWireInput): ConstructionCommand => ({
  execute: (state) => {
    if (input.context === 'player') return reject('wiring-not-permitted');
    if (state.document.wires.some(({ targetId }) => targetId === input.targetId)) {
      return reject('wire-already-connected');
    }

    const documentCandidate = {
      ...state.document,
      wires: [
        ...state.document.wires,
        { id: input.wireId, sourceId: input.sourceId, targetId: input.targetId },
      ],
    };
    return acceptCandidate(documentCandidate, state.provenance);
  },
});

export const disconnectControlWire = (input: DisconnectControlWireInput): ConstructionCommand => ({
  execute: (state) => {
    if (input.context === 'player') return reject('wiring-not-permitted');
    if (!state.document.wires.some(({ id }) => id === input.wireId)) {
      return reject('wire-not-found');
    }

    const documentCandidate = {
      ...state.document,
      wires: state.document.wires.filter(({ id }) => id !== input.wireId),
    };
    return acceptCandidate(documentCandidate, state.provenance);
  },
});

import { beamPropertiesSchema } from '../../domain/object-family-registry';
import { levelDocumentSchema, type LevelDocument } from '../../domain/level-document';
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
type BeamPlacement = Extract<Placement, { readonly type: 'beam' }>;
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
 * Persistent property editing is deliberately limited to beam sizes in v1.
 * Other object families have no author-editable properties yet.
 */
interface UpdatePlacementPropertiesInput {
  readonly context: ConstructionContext;
  readonly placementId: string;
  readonly props: BeamPlacement['props'];
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

const acceptCandidate = (
  documentCandidate: unknown,
  provenance: Readonly<Record<string, string>>,
): ConstructionCommandOutcome => {
  const validation = levelDocumentSchema.safeParse(documentCandidate);
  if (!validation.success) return reject('invalid-level-document');

  return { status: 'accepted', state: freezeAttempt(validation.data, provenance) };
};

/**
 * V1 checks the placement centre only. Full-shape containment belongs to the
 * future physical catalogue because object dimensions do not exist in v1 yet.
 */
const isCentreInsideBuildZone = (document: LevelDocument, position: WorldPosition): boolean =>
  document.buildZones.some(
    ({ min, max }) =>
      position.x >= min.x && position.x <= max.x && position.y >= min.y && position.y <= max.y,
  );

const definitionsMatch = (placement: Placement, inventoryEntry: InventoryEntry): boolean => {
  if (placement.type !== inventoryEntry.type) return false;

  const propertiesMatch =
    placement.type !== 'beam' ||
    (inventoryEntry.type === 'beam' && placement.props.size === inventoryEntry.props.size);

  return (
    propertiesMatch &&
    placement.permissions.move === inventoryEntry.permissions.move &&
    placement.permissions.rotate === inventoryEntry.permissions.rotate &&
    placement.permissions.remove === inventoryEntry.permissions.remove
  );
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
      !isCentreInsideBuildZone(state.document, input.transform.position)
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
    if (input.context === 'player' && !isCentreInsideBuildZone(state.document, input.position)) {
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
    if (placement.type !== 'beam') return reject('placement-not-rotatable');
    if (input.context === 'player' && !placement.permissions.rotate) {
      return reject('rotate-not-permitted');
    }
    if (
      input.context === 'player' &&
      !isCentreInsideBuildZone(state.document, placement.transform.position)
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
    const properties = beamPropertiesSchema.safeParse(input.props);
    if (!properties.success) return reject('invalid-level-document');

    if (input.context === 'player') return reject('properties-not-permitted');

    const placement = state.document.objects.find(({ id }) => id === input.placementId);
    if (placement === undefined) return reject('placement-not-found');

    if (placement.type === 'beam' && placement.props.size === properties.data.size) {
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
    };
    const provenance = Object.fromEntries(
      Object.entries(state.provenance).filter(([placementId]) => placementId !== placement.id),
    );
    return acceptCandidate(documentCandidate, provenance);
  },
});

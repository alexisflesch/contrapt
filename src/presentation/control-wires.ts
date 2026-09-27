import { controlCircuits } from '../domain/control-circuits';
import type { WorldPoint } from '../domain/family-geometry';
import type { LevelDocument } from '../domain/level-document';

/**
 * ADR 0009: a wire is a relation in the document; its segment, letter and
 * colour are derived here, deterministically, every time the board is
 * drawn. Nothing below is persisted.
 */

export interface ProjectedWire {
  readonly id: string;
  readonly sourceId: string;
  readonly targetId: string;
  readonly label: string;
  /** Index of the circuit, mapped to a colour by the renderer. */
  readonly circuitIndex: number;
  /** Straight segment in world units, from the controller's port to the device's. */
  readonly from: WorldPoint;
  readonly to: WorldPoint;
}

type Placement = LevelDocument['objects'][number];

/** Port offset of a wired family, relative to the placement's origin, on its right side. */
const portOffset = (placement: Placement): WorldPoint | undefined => {
  switch (placement.type) {
    case 'lever':
      // Middle of the base's bar, level with the pivot's bolt.
      return { x: 0.4, y: 0.05 };
    case 'conveyor':
      // End of the frame, on the belt's axis.
      return { x: 1.5, y: 0 };
    case 'button':
      // Edge of the base plate.
      return { x: 0.4, y: 0.17 };
    case 'fan':
      // Foot of the frame; it turns with the fan.
      return { x: 0.6, y: 0.4 };
    case 'barrier':
      // End of the pillar's plinth.
      return { x: 0.4, y: 0.35 };
    case 'ball':
    case 'basket':
    case 'beam':
    case 'seesaw':
    case 'mass':
    case 'springboard':
      return undefined;
  }
};

const rotate = ({ x, y }: WorldPoint, angle: number): WorldPoint => ({
  x: x * Math.cos(angle) - y * Math.sin(angle),
  y: x * Math.sin(angle) + y * Math.cos(angle),
});

/** The object's port on the side facing `towardsX`. */
const portFacing = (placement: Placement, towardsX: number): WorldPoint | undefined => {
  const offset = portOffset(placement);
  if (offset === undefined) return undefined;

  const { position, rotation } = placement.transform;
  const [right, left] = [offset, { x: -offset.x, y: offset.y }].map((local) =>
    rotate(local, rotation),
  );
  if (right === undefined || left === undefined) return undefined;
  const port = towardsX >= position.x === right.x >= 0 ? right : left;
  return { x: position.x + port.x, y: position.y + port.y };
};

/**
 * Draws every wire of the document as one straight segment between the
 * ports of its two objects, drawn behind the objects: it never goes around
 * them, and crossings mean nothing.
 */
export const projectWires = (document: LevelDocument): readonly ProjectedWire[] => {
  const placementsById = new Map(document.objects.map((placement) => [placement.id, placement]));
  const circuitsBySource = new Map(
    controlCircuits(document.wires).map((circuit) => [circuit.sourceId, circuit]),
  );

  return document.wires.flatMap((wire) => {
    const source = placementsById.get(wire.sourceId);
    const target = placementsById.get(wire.targetId);
    const circuit = circuitsBySource.get(wire.sourceId);
    if (source === undefined || target === undefined || circuit === undefined) return [];

    const from = portFacing(source, target.transform.position.x);
    const to = portFacing(target, source.transform.position.x);
    if (from === undefined || to === undefined) return [];

    return [
      {
        id: wire.id,
        sourceId: wire.sourceId,
        targetId: wire.targetId,
        label: circuit.label,
        circuitIndex: circuit.index,
        from,
        to,
      },
    ];
  });
};

import { controlCircuits } from '../domain/control-circuits';
import type { WorldPoint, WorldPolygon, WorldRect } from '../domain/family-geometry';
import type { LevelDocument } from '../domain/level-document';

/**
 * ADR 0009: a wire is a relation in the document; its route, bridges,
 * letter and colour are derived here, deterministically, every time the
 * board is drawn. Nothing below is persisted.
 */

/** Where a wire plugs into an object, and which way (along x) it leaves it. */
export interface WirePort {
  readonly position: WorldPoint;
  readonly side: -1 | 1;
}

export interface ProjectedWire {
  readonly id: string;
  readonly sourceId: string;
  readonly targetId: string;
  readonly label: string;
  /** Index of the circuit, mapped to a colour by the renderer. */
  readonly circuitIndex: number;
  /** Orthogonal polyline in world units, from the controller to the device. */
  readonly points: WorldPolygon;
  /** Where this wire hops over an older one. */
  readonly bridges: WorldPolygon;
}

/** A wire leaves its port straight for this long before its first turn. */
const STUB_LENGTH = 0.3;
/** Clearance kept between a detour and the object it goes around. */
const DETOUR_MARGIN = 0.3;
/** One crossing costs more than any route length a scene can produce (64 units wide). */
const CROSSING_COST = 1_000;
const BEND_COST = 0.5;

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
const portFacing = (placement: Placement, towardsX: number): WirePort | undefined => {
  const offset = portOffset(placement);
  if (offset === undefined) return undefined;

  const { position, rotation } = placement.transform;
  const candidates = [offset, { x: -offset.x, y: offset.y }].map((local) => {
    const turned = rotate(local, rotation);
    return {
      position: { x: position.x + turned.x, y: position.y + turned.y },
      side: turned.x >= 0 ? 1 : -1,
    } as const;
  });
  const [right, left] = candidates;
  if (right === undefined || left === undefined) return undefined;
  return towardsX >= position.x === (right.side === 1) ? right : left;
};

const segments = (points: WorldPolygon): readonly (readonly [WorldPoint, WorldPoint])[] =>
  points.slice(1).map((point, index) => [points[index] ?? point, point] as const);

const segmentEntersRect = ([a, b]: readonly [WorldPoint, WorldPoint], rect: WorldRect): boolean =>
  Math.max(a.x, b.x) > rect.x &&
  Math.min(a.x, b.x) < rect.x + rect.width &&
  Math.max(a.y, b.y) > rect.y &&
  Math.min(a.y, b.y) < rect.y + rect.height;

const pathLength = (points: WorldPolygon): number =>
  segments(points).reduce((sum, [a, b]) => sum + Math.abs(b.x - a.x) + Math.abs(b.y - a.y), 0);

/** Drops repeated points and points in the middle of a straight run. */
const simplify = (points: WorldPolygon): WorldPolygon => {
  const distinct = points.filter((point, index) => {
    const previous = points[index - 1];
    return previous === undefined || previous.x !== point.x || previous.y !== point.y;
  });
  return distinct.filter((point, index) => {
    const previous = distinct[index - 1];
    const next = distinct[index + 1];
    if (previous === undefined || next === undefined) return true;
    const straight =
      (previous.x === point.x && point.x === next.x) ||
      (previous.y === point.y && point.y === next.y);
    return !straight;
  });
};

const cost = (points: WorldPolygon, obstacles: readonly WorldRect[]): number => {
  const crossings = obstacles.filter((rect) =>
    segments(points).some((segment) => segmentEntersRect(segment, rect)),
  ).length;
  return crossings * CROSSING_COST + pathLength(points) + (points.length - 2) * BEND_COST;
};

/** Candidate abscissas for a single vertical run, inside the interval both ports allow. */
const verticalRunCandidates = (
  source: WirePort,
  target: WirePort,
  obstacles: readonly WorldRect[],
): readonly number[] => {
  // A port leaving rightwards needs the run to its right, and conversely.
  const stubEnds = [source, target].map(({ position, side }) => ({
    x: position.x + side * STUB_LENGTH,
    side,
  }));
  const low = Math.max(...stubEnds.filter(({ side }) => side === 1).map(({ x }) => x));
  const high = Math.min(...stubEnds.filter(({ side }) => side === -1).map(({ x }) => x));
  if (low > high) return [];

  // Midway when boxed in on both sides, else as close to the ports as allowed.
  const first =
    Number.isFinite(low) && Number.isFinite(high)
      ? (low + high) / 2
      : Number.isFinite(low)
        ? low
        : high;
  const aroundObstacles = obstacles.flatMap((rect) => [
    rect.x - DETOUR_MARGIN / 2,
    rect.x + rect.width + DETOUR_MARGIN / 2,
  ]);
  return [first, ...aroundObstacles].filter((x) => x >= low && x <= high);
};

/**
 * Routes one wire with horizontal and vertical segments only. It prefers,
 * in that order, not crossing objects, a short path and few bends. Each
 * wire is routed alone, so adding a wire never moves the others; their
 * crossings are settled afterwards by bridges.
 */
export const routeWire = (
  source: WirePort,
  target: WirePort,
  obstacles: readonly WorldRect[],
): WorldPolygon => {
  const start = source.position;
  const end = target.position;
  const sourceStub = { x: start.x + source.side * STUB_LENGTH, y: start.y };
  const targetStub = { x: end.x + target.side * STUB_LENGTH, y: end.y };

  const singleRuns = verticalRunCandidates(source, target, obstacles).map((x) => [
    start,
    { x, y: start.y },
    { x, y: end.y },
    end,
  ]);
  const detourHeights = [
    (start.y + end.y) / 2,
    ...obstacles.flatMap((rect) => [rect.y - DETOUR_MARGIN, rect.y + rect.height + DETOUR_MARGIN]),
  ];
  const detours = detourHeights.map((y) => [
    start,
    sourceStub,
    { x: sourceStub.x, y },
    { x: targetStub.x, y },
    targetStub,
    end,
  ]);

  let best: WorldPolygon = [start, end];
  let bestCost = Infinity;
  for (const candidate of [...singleRuns, ...detours].map(simplify)) {
    const candidateCost = cost(candidate, obstacles);
    if (candidateCost < bestCost) {
      best = candidate;
      bestCost = candidateCost;
    }
  }
  return best;
};

const strictlyBetween = (value: number, a: number, b: number): boolean =>
  value > Math.min(a, b) && value < Math.max(a, b);

/** Where a horizontal segment and a vertical one cross inside both, if they do. */
const crossing = (
  [a, b]: readonly [WorldPoint, WorldPoint],
  [c, d]: readonly [WorldPoint, WorldPoint],
): WorldPoint | undefined => {
  const horizontal = a.y === b.y && c.x === d.x;
  const vertical = a.x === b.x && c.y === d.y;
  if (horizontal && strictlyBetween(c.x, a.x, b.x) && strictlyBetween(a.y, c.y, d.y)) {
    return { x: c.x, y: a.y };
  }
  if (vertical && strictlyBetween(a.x, c.x, d.x) && strictlyBetween(c.y, a.y, b.y)) {
    return { x: a.x, y: c.y };
  }
  return undefined;
};

/**
 * ADR 0009: a crossing means nothing; it is drawn as a bridge, the most
 * recently created wire hopping over the older one.
 */
export const findWireBridges = (routes: readonly WorldPolygon[]): readonly WorldPolygon[] =>
  routes.map((route, index) =>
    segments(route).flatMap((segment) =>
      routes
        .slice(0, index)
        .flatMap((older) =>
          segments(older).flatMap((olderSegment) => crossing(segment, olderSegment) ?? []),
        ),
    ),
  );

const worldBounds = (placement: Placement, footprint: WorldRect): WorldRect => {
  const { position, rotation } = placement.transform;
  const corners = [
    { x: footprint.x, y: footprint.y },
    { x: footprint.x + footprint.width, y: footprint.y },
    { x: footprint.x + footprint.width, y: footprint.y + footprint.height },
    { x: footprint.x, y: footprint.y + footprint.height },
  ].map((corner) => rotate(corner, rotation));
  const xs = corners.map(({ x }) => x + position.x);
  const ys = corners.map(({ y }) => y + position.y);
  return {
    x: Math.min(...xs),
    y: Math.min(...ys),
    width: Math.max(...xs) - Math.min(...xs),
    height: Math.max(...ys) - Math.min(...ys),
  };
};

/** Routes every wire of the document around the other objects' footprints. */
export const projectWires = (
  document: LevelDocument,
  footprintOf: (placement: Placement) => WorldRect,
): readonly ProjectedWire[] => {
  const placementsById = new Map(document.objects.map((placement) => [placement.id, placement]));
  const circuitsBySource = new Map(
    controlCircuits(document.wires).map((circuit) => [circuit.sourceId, circuit]),
  );

  const routed = document.wires.flatMap((wire) => {
    const source = placementsById.get(wire.sourceId);
    const target = placementsById.get(wire.targetId);
    const circuit = circuitsBySource.get(wire.sourceId);
    if (source === undefined || target === undefined || circuit === undefined) return [];

    const sourcePort = portFacing(source, target.transform.position.x);
    const targetPort = portFacing(target, source.transform.position.x);
    if (sourcePort === undefined || targetPort === undefined) return [];

    const obstacles = document.objects
      .filter(({ id }) => id !== source.id && id !== target.id)
      .map((placement) => worldBounds(placement, footprintOf(placement)));
    return [{ wire, circuit, points: routeWire(sourcePort, targetPort, obstacles) }];
  });

  const bridges = findWireBridges(routed.map(({ points }) => points));
  return routed.map(({ wire, circuit, points }, index) => ({
    id: wire.id,
    sourceId: wire.sourceId,
    targetId: wire.targetId,
    label: circuit.label,
    circuitIndex: circuit.index,
    points,
    bridges: bridges[index] ?? [],
  }));
};

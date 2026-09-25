/**
 * World-unit geometry of the object families (ADR 0007), relative to a
 * placement's origin, `y` growing downwards. The physics adapter builds its
 * colliders from it and the board projection derives sprite destinations
 * from it, so a sprite and its collider cannot drift apart.
 *
 * Polygons are measured on the source art by `art/build-sprites.py`, which
 * prints them; they are copied here by hand when the art changes.
 */

export type WorldPoint = Readonly<{ readonly x: number; readonly y: number }>;
export type WorldPolygon = readonly WorldPoint[];

/** A rectangle whose `x`/`y` is its top-left corner, relative to the placement's origin. */
export type WorldRect = Readonly<{
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}>;

const centeredRect = (width: number, height: number): WorldRect => ({
  x: -width / 2,
  y: -height / 2,
  width,
  height,
});

const polygon = (points: readonly (readonly [number, number])[]): WorldPolygon =>
  points.map(([x, y]) => ({ x, y }));

const BALL_RADIUS = 0.3;

export const ballGeometry = {
  radius: BALL_RADIUS,
  footprint: centeredRect(2 * BALL_RADIUS, 2 * BALL_RADIUS),
} as const;

export const basketGeometry = {
  footprint: centeredRect(1.5, 1.1),
} as const;

const BEAM_THICKNESS = 0.25;

export const beamGeometry = {
  thickness: BEAM_THICKNESS,
  footprints: {
    short: centeredRect(2, BEAM_THICKNESS),
    medium: centeredRect(4, BEAM_THICKNESS),
    long: centeredRect(6, BEAM_THICKNESS),
  },
} as const;

const SEESAW_BOARD_HALF_LENGTH = 1.5;
const SEESAW_BOARD_HALF_THICKNESS = 0.12;
/** The fulcrum stands right under the board and ends 0,70 below the pivot (A4). */
const SEESAW_FULCRUM_BOTTOM = 0.7;
const SEESAW_FULCRUM_WIDTH = 0.5929;

/**
 * The seesaw's origin is its pivot. The board is centred on it; the fulcrum
 * is a separate static piece standing under the board and never rotates.
 */
export const seesawGeometry = {
  board: {
    halfLength: SEESAW_BOARD_HALF_LENGTH,
    halfThickness: SEESAW_BOARD_HALF_THICKNESS,
    footprint: centeredRect(2 * SEESAW_BOARD_HALF_LENGTH, 2 * SEESAW_BOARD_HALF_THICKNESS),
  },
  fulcrum: {
    footprint: {
      x: -SEESAW_FULCRUM_WIDTH / 2,
      y: SEESAW_BOARD_HALF_THICKNESS,
      width: SEESAW_FULCRUM_WIDTH,
      height: SEESAW_FULCRUM_BOTTOM - SEESAW_BOARD_HALF_THICKNESS,
    },
    polygon: polygon([
      [-0.2907, 0.5611],
      [-0.0874, 0.1687],
      [0.0158, 0.1214],
      [0.0888, 0.173],
      [0.2893, 0.5611],
      [0.2549, 0.6986],
      [-0.2563, 0.6986],
      [-0.295, 0.6642],
    ]),
  },
  /** Union of both pieces, used to select and frame the seesaw as one object. */
  footprint: {
    x: -SEESAW_BOARD_HALF_LENGTH,
    y: -SEESAW_BOARD_HALF_THICKNESS,
    width: 2 * SEESAW_BOARD_HALF_LENGTH,
    height: SEESAW_FULCRUM_BOTTOM + SEESAW_BOARD_HALF_THICKNESS,
  },
} as const;

const MASS_WIDTH = 0.8;
const MASS_HEIGHT = 0.772;

/** A free weight; its origin is the centre of its footprint. */
export const massGeometry = {
  footprint: centeredRect(MASS_WIDTH, MASS_HEIGHT),
  polygon: polygon([
    [-0.3963, 0.0092],
    [-0.3381, -0.2356],
    [0.0218, -0.3823],
    [0.3373, -0.2334],
    [0.3948, 0.1781],
    [0.1405, 0.3757],
    [-0.1242, 0.3853],
    [-0.3889, 0.1921],
  ]),
} as const;

export type LeverPosition = 'left' | 'center' | 'right';

/** The handle tilts a quarter of a right angle either side, as drawn in the source art. */
const LEVER_TILT = Math.PI / 4;

const rotatePoint = ({ x, y }: WorldPoint, angle: number): WorldPoint => ({
  x: x * Math.cos(angle) - y * Math.sin(angle),
  y: x * Math.sin(angle) + y * Math.cos(angle),
});

const rectCorners = ({ x, y, width, height }: WorldRect): WorldPolygon => [
  { x, y },
  { x: x + width, y },
  { x: x + width, y: y + height },
  { x, y: y + height },
];

const boundingRect = (points: WorldPolygon): WorldRect => {
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  return {
    x: Math.min(...xs),
    y: Math.min(...ys),
    width: Math.max(...xs) - Math.min(...xs),
    height: Math.max(...ys) - Math.min(...ys),
  };
};

const LEVER_BASE_FOOTPRINT: WorldRect = { x: -0.4, y: -0.2825, width: 0.8, height: 0.414 };
/** The handle drawn upright; its origin is the pivot, like the lever's. */
const LEVER_HANDLE_FOOTPRINT: WorldRect = { x: -0.1747, y: -0.8804, width: 0.3494, height: 0.9997 };

/**
 * The lever's origin is its pivot. The base never moves; the handle turns
 * around the pivot and its angle, not the document, says where it stands
 * once the simulation runs.
 */
export const leverGeometry = {
  tilt: LEVER_TILT,
  base: {
    footprint: LEVER_BASE_FOOTPRINT,
    polygon: polygon([
      [-0.3988, 0.017],
      [-0.1443, -0.2265],
      [-0.0749, -0.2679],
      [0.0542, -0.2764],
      [0.1504, -0.224],
      [0.3976, 0.0183],
      [0.372, 0.1291],
      [-0.3732, 0.1291],
    ]),
  },
  handle: {
    footprint: LEVER_HANDLE_FOOTPRINT,
    stickHalfWidth: 0.04,
    knobCenterY: -0.7043,
    knobRadius: 0.1534,
  },
} as const;

export const leverAngle = (position: LeverPosition): number =>
  position === 'left' ? -LEVER_TILT : position === 'right' ? LEVER_TILT : 0;

/** Base and handle together, with the handle at `position`: what the editor selects. */
export const leverFootprint = (position: LeverPosition): WorldRect =>
  boundingRect([
    ...rectCorners(LEVER_BASE_FOOTPRINT),
    ...rectCorners(LEVER_HANDLE_FOOTPRINT).map((corner) =>
      rotatePoint(corner, leverAngle(position)),
    ),
  ]);

/** A three-unit belt; its origin is the centre of its frame. */
export const conveyorGeometry = {
  footprint: centeredRect(3, 0.5799),
} as const;

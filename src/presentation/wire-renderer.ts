import type { WorldPoint } from '../domain/family-geometry';
import type { ProjectedWire } from './control-wires';

type ScreenPoint = WorldPoint;

/** The operations the wires need, all present on a real `CanvasRenderingContext2D`. */
export type WireCanvas = {
  globalAlpha: number;
  strokeStyle: string;
  fillStyle: string;
  lineWidth: number;
  lineCap: CanvasLineCap;
  lineJoin: CanvasLineJoin;
  font: string;
  textAlign: CanvasTextAlign;
  textBaseline: CanvasTextBaseline;
  readonly save: () => void;
  readonly restore: () => void;
  readonly beginPath: () => void;
  readonly moveTo: (x: number, y: number) => void;
  readonly lineTo: (x: number, y: number) => void;
  readonly arcTo: (x1: number, y1: number, x2: number, y2: number, radius: number) => void;
  readonly arc: (
    x: number,
    y: number,
    radius: number,
    startAngle: number,
    endAngle: number,
    counterclockwise?: boolean,
  ) => void;
  readonly stroke: () => void;
  readonly fill: () => void;
  readonly fillText: (text: string, x: number, y: number) => void;
};

/**
 * Circuit colours, in circuit order. Colour is only a second cue: the
 * circuit letter is always drawn at both ends (ADR 0009).
 */
const CIRCUIT_COLOURS = ['#e53935', '#1e88e5', '#43a047', '#fb8c00', '#8e24aa', '#00897b'];
const CASING_COLOUR = '#1d1f24';
/** Wire sizes are CSS pixels, like the selection outline: readable at every zoom. */
const CASING_WIDTH = 6;
const CORE_WIDTH = 3;
const CORNER_RADIUS = 6;
const BRIDGE_RADIUS = 6;
const LABEL_RADIUS = 9;
/** Badges sit on the wire, this far from its end: "[A]───" rather than on the object. */
const LABEL_INSET = 18;
/** Same stack as the interface (`--font-ui`), so the letter matches the rest of the UI. */
const LABEL_FONT =
  "bold 11px ui-rounded, 'Nunito', 'Varela Round', system-ui, 'Segoe UI', Roboto, Arial, sans-serif";
const DIMMED_ALPHA = 0.25;
const UNRELATED_ALPHA = 0.4;

const circuitColour = (circuitIndex: number): string =>
  CIRCUIT_COLOURS[circuitIndex % CIRCUIT_COLOURS.length] ?? CASING_COLOUR;

const bridgesOn = (
  from: ScreenPoint,
  to: ScreenPoint,
  bridges: readonly ScreenPoint[],
): readonly ScreenPoint[] => {
  const horizontal = from.y === to.y;
  const along = (point: ScreenPoint): number => (horizontal ? point.x : point.y);
  const direction = Math.sign(along(to) - along(from));
  return bridges
    .filter((bridge) =>
      horizontal
        ? bridge.y === from.y && (bridge.x - from.x) * (bridge.x - to.x) < 0
        : bridge.x === from.x && (bridge.y - from.y) * (bridge.y - to.y) < 0,
    )
    .sort((a, b) => (along(a) - along(b)) * direction);
};

/** A half circle hopping over the older wire: upwards on a horizontal run, rightwards on a vertical one. */
const traceBridge = (
  context: WireCanvas,
  from: ScreenPoint,
  to: ScreenPoint,
  bridge: ScreenPoint,
): void => {
  if (from.y === to.y) {
    const rightwards = to.x > from.x;
    context.lineTo(bridge.x + (rightwards ? -BRIDGE_RADIUS : BRIDGE_RADIUS), bridge.y);
    context.arc(
      bridge.x,
      bridge.y,
      BRIDGE_RADIUS,
      rightwards ? Math.PI : 0,
      rightwards ? 0 : Math.PI,
      !rightwards,
    );
  } else {
    const downwards = to.y > from.y;
    context.lineTo(bridge.x, bridge.y + (downwards ? -BRIDGE_RADIUS : BRIDGE_RADIUS));
    context.arc(
      bridge.x,
      bridge.y,
      BRIDGE_RADIUS,
      downwards ? -Math.PI / 2 : Math.PI / 2,
      downwards ? Math.PI / 2 : -Math.PI / 2,
      !downwards,
    );
  }
};

const tracePath = (
  context: WireCanvas,
  points: readonly ScreenPoint[],
  bridges: readonly ScreenPoint[],
): void => {
  const [first] = points;
  if (first === undefined) return;

  context.beginPath();
  context.moveTo(first.x, first.y);
  points.forEach((from, index) => {
    const to = points[index + 1];
    if (to === undefined) return;
    for (const bridge of bridgesOn(from, to, bridges)) traceBridge(context, from, to, bridge);

    const after = points[index + 2];
    if (after === undefined) {
      context.lineTo(to.x, to.y);
    } else {
      context.arcTo(to.x, to.y, after.x, after.y, CORNER_RADIUS);
    }
  });
};

const wireAlpha = (wire: ProjectedWire, dimmed: boolean, focusId: string | undefined): number => {
  if (dimmed) return DIMMED_ALPHA;
  if (focusId === undefined) return 1;
  return wire.sourceId === focusId || wire.targetId === focusId ? 1 : UNRELATED_ALPHA;
};

/**
 * Draws every wire as a dark casing under a coloured core. When a lever or
 * a conveyor is selected, its wires stay bright and the others fade.
 */
export const drawWires = (
  context: WireCanvas,
  wires: readonly ProjectedWire[],
  toScreen: (point: WorldPoint) => ScreenPoint,
  options: { readonly dimmed: boolean; readonly focusId: string | undefined },
): void => {
  for (const wire of wires) {
    const points = wire.points.map(toScreen);
    const bridges = wire.bridges.map(toScreen);
    context.save();
    context.globalAlpha = wireAlpha(wire, options.dimmed, options.focusId);
    context.lineCap = 'round';
    context.lineJoin = 'round';
    for (const [colour, width] of [
      [CASING_COLOUR, CASING_WIDTH],
      [circuitColour(wire.circuitIndex), CORE_WIDTH],
    ] as const) {
      tracePath(context, points, bridges);
      context.strokeStyle = colour;
      context.lineWidth = width;
      context.stroke();
    }
    context.restore();
  }
};

/** A point `LABEL_INSET` from `end` towards `towards`, never past half the segment. */
const insetAlong = (end: ScreenPoint, towards: ScreenPoint): ScreenPoint => {
  const length = Math.hypot(towards.x - end.x, towards.y - end.y);
  if (length === 0) return end;
  const distance = Math.min(LABEL_INSET, length / 2);
  return {
    x: end.x + ((towards.x - end.x) / length) * distance,
    y: end.y + ((towards.y - end.y) / length) * distance,
  };
};

/** The circuit letter on both ends of each wire, drawn over the objects. */
export const drawWireLabels = (
  context: WireCanvas,
  wires: readonly ProjectedWire[],
  toScreen: (point: WorldPoint) => ScreenPoint,
  options: { readonly dimmed: boolean; readonly focusId: string | undefined },
): void => {
  for (const wire of wires) {
    const points = wire.points.map(toScreen);
    const centres = [
      [points[0], points[1]],
      [points.at(-1), points.at(-2)],
    ].flatMap(([end, towards]) =>
      end === undefined || towards === undefined ? [] : [insetAlong(end, towards)],
    );
    context.save();
    context.globalAlpha = wireAlpha(wire, options.dimmed, options.focusId);
    context.font = LABEL_FONT;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    for (const centre of centres) {
      context.beginPath();
      context.arc(centre.x, centre.y, LABEL_RADIUS, 0, 2 * Math.PI);
      context.fillStyle = circuitColour(wire.circuitIndex);
      context.fill();
      context.strokeStyle = CASING_COLOUR;
      context.lineWidth = 2;
      context.stroke();
      context.fillStyle = '#ffffff';
      context.fillText(wire.label, centre.x, centre.y);
    }
    context.restore();
  }
};

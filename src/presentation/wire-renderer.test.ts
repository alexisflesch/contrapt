import { describe, expect, it } from 'vitest';
import type { ProjectedWire } from './control-wires';
import { drawWireLabels, drawWires, type WireCanvas } from './wire-renderer';

/** Median colour of the goal ball (`ball-base@2x.png`) and the board's plain parchment, `#f6ead3` (V2b). */
const GOAL_BALL_RED = { r: 222, g: 17, b: 17 };
const CREAM_BOARD = { r: 246, g: 234, b: 211 };
const PALETTE_PROBE = 12;

type Rgb = typeof GOAL_BALL_RED;

const parseHex = (hex: string): Rgb => {
  const match = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (match === null) throw new Error(`Couleur inattendue : ${hex}`);
  const [, r = '', g = '', b = ''] = match;
  return { r: parseInt(r, 16), g: parseInt(g, 16), b: parseInt(b, 16) };
};

const hueDegrees = ({ r, g, b }: Rgb): number => {
  const max = Math.max(r, g, b);
  const delta = max - Math.min(r, g, b);
  if (delta === 0) return 0;
  const sector =
    max === r ? ((g - b) / delta + 6) % 6 : max === g ? (b - r) / delta + 2 : (r - g) / delta + 4;
  return sector * 60;
};

const hueDistance = (left: Rgb, right: Rgb): number => {
  const difference = Math.abs(hueDegrees(left) - hueDegrees(right)) % 360;
  return Math.min(difference, 360 - difference);
};

const luminance = ({ r, g, b }: Rgb): number => {
  const linear = (channel: number): number => {
    const value = channel / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
};

const contrast = (left: Rgb, right: Rgb): number => {
  const [light, dark] = [luminance(left), luminance(right)].sort((a, b) => b - a);
  return ((light ?? 0) + 0.05) / ((dark ?? 0) + 0.05);
};

/** Records the core colour of each wire and the badge colour of each label. */
const recordingCanvas = (): { readonly canvas: WireCanvas; readonly colours: string[] } => {
  const colours: string[] = [];
  const canvas: WireCanvas = {
    globalAlpha: 1,
    strokeStyle: '',
    fillStyle: '',
    lineWidth: 1,
    lineCap: 'butt',
    font: '',
    textAlign: 'start',
    textBaseline: 'alphabetic',
    save: () => undefined,
    restore: () => undefined,
    beginPath: () => undefined,
    moveTo: () => undefined,
    lineTo: () => undefined,
    arc: () => undefined,
    stroke: () => {
      // The casing is the wider, dark stroke; the circuit colour is the core.
      if (canvas.lineWidth < 3) colours.push(canvas.strokeStyle);
    },
    fill: () => {
      colours.push(canvas.fillStyle);
    },
    fillText: () => undefined,
  };
  return { canvas, colours };
};

const circuitColours = (): readonly string[] => {
  const wires: ProjectedWire[] = Array.from({ length: PALETTE_PROBE }, (_, circuitIndex) => ({
    id: `wire-${String(circuitIndex)}`,
    sourceId: `lever-${String(circuitIndex)}`,
    targetId: `fan-${String(circuitIndex)}`,
    circuitIndex,
    label: 'A',
    from: { x: 0, y: 0 },
    to: { x: 1, y: 0 },
  }));
  const { canvas, colours } = recordingCanvas();
  const options = { dimmed: false, focusId: undefined };
  drawWires(canvas, wires, (point) => point, options);
  drawWireLabels(canvas, wires, (point) => point, options);
  return [...new Set(colours)];
};

describe('tracé en équerre', () => {
  const points: Array<{ x: number; y: number }> = [];
  const centres: Array<{ x: number; y: number }> = [];

  const canvas: WireCanvas = {
    globalAlpha: 1,
    strokeStyle: '',
    fillStyle: '',
    lineWidth: 1,
    lineCap: 'butt',
    font: '',
    textAlign: 'start',
    textBaseline: 'alphabetic',
    save: () => undefined,
    restore: () => undefined,
    beginPath: () => undefined,
    moveTo: (x, y) => points.push({ x, y }),
    lineTo: (x, y) => points.push({ x, y }),
    arc: (x, y) => centres.push({ x, y }),
    stroke: () => undefined,
    fill: () => undefined,
    fillText: () => undefined,
  };

  const bent: ProjectedWire = {
    id: 'wire-1',
    sourceId: 'lever-1',
    targetId: 'conveyor-1',
    circuitIndex: 0,
    label: 'A',
    from: { x: 0, y: 0 },
    to: { x: 3, y: 2 },
    bend: { x: 3, y: 0 },
  };

  it('passe par le coude plutôt que par la diagonale quand `bend` existe', () => {
    points.length = 0;
    drawWires(canvas, [bent], (point) => point, { dimmed: false, focusId: undefined });

    // One moveTo + two lineTo per stroke pass (casing, then core).
    expect(points).toEqual([
      { x: 0, y: 0 },
      { x: 3, y: 0 },
      { x: 3, y: 2 },
      { x: 0, y: 0 },
      { x: 3, y: 0 },
      { x: 3, y: 2 },
    ]);
  });

  it('trace un seul segment quand `bend` est absent', () => {
    points.length = 0;
    const straight: ProjectedWire = {
      id: bent.id,
      sourceId: bent.sourceId,
      targetId: bent.targetId,
      circuitIndex: bent.circuitIndex,
      label: bent.label,
      from: bent.from,
      to: { x: 3, y: 0 },
    };
    drawWires(canvas, [straight], (point) => point, { dimmed: false, focusId: undefined });

    expect(points).toEqual([
      { x: 0, y: 0 },
      { x: 3, y: 0 },
      { x: 0, y: 0 },
      { x: 3, y: 0 },
    ]);
  });

  it('pose chaque pastille sur son propre segment de l’équerre, pas sur la diagonale', () => {
    centres.length = 0;
    drawWireLabels(canvas, [bent], (point) => point, { dimmed: false, focusId: undefined });

    // Near `from`, inset along the first (horizontal) leg: y stays 0.
    expect(centres[0]).toEqual({ x: 1.5, y: 0 });
    // Near `to`, inset along the second (vertical) leg: x stays 3.
    expect(centres[1]).toEqual({ x: 3, y: 1 });
  });
});

describe('couleurs des circuits de fils', () => {
  const palette = circuitColours().map((hex) => [hex, parseHex(hex)] as const);

  it('propose plusieurs couleurs, tracé et pastille de même couleur', () => {
    expect(palette.length).toBeGreaterThanOrEqual(4);
  });

  it.each(palette)(
    '%s ne rappelle pas le rouge réservé à la balle de l’objectif',
    (_hex, colour) => {
      expect(hueDistance(colour, GOAL_BALL_RED)).toBeGreaterThanOrEqual(30);
    },
  );

  it.each(palette)('%s reste lisible sur le fond crème', (_hex, colour) => {
    expect(contrast(colour, CREAM_BOARD)).toBeGreaterThanOrEqual(3);
  });

  it('garde des couleurs bien distinctes entre elles', () => {
    for (const [leftHex, left] of palette) {
      for (const [rightHex, right] of palette) {
        if (leftHex === rightHex) continue;
        expect(hueDistance(left, right), `${leftHex} / ${rightHex}`).toBeGreaterThanOrEqual(30);
      }
    }
  });
});

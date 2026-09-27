import { describe, expect, it } from 'vitest';
import type { ProjectedWire } from './control-wires';
import { drawWireLabels, drawWires, type WireCanvas } from './wire-renderer';

/** Median colour of the goal ball (`ball-base@2x.png`) and of the board (`board-generic-v0.png`). */
const GOAL_BALL_RED = { r: 222, g: 17, b: 17 };
const CREAM_BOARD = { r: 250, g: 234, b: 208 };
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

import { describe, expect, it } from 'vitest';

import {
  leverFootprint,
  leverGeometry,
  massGeometry,
  seesawGeometry,
  type WorldPolygon,
  type WorldRect,
} from './family-geometry';

const MAX_POLYGON_VERTICES = 8;
/** The polygons are measured on sprites; a hundredth of a unit is under a pixel at 64 px/unit. */
const MEASUREMENT_TOLERANCE = 0.01;

const isConvex = (polygon: WorldPolygon): boolean => {
  const signs = polygon.map((point, index) => {
    const next = polygon[(index + 1) % polygon.length] ?? point;
    const afterNext = polygon[(index + 2) % polygon.length] ?? point;
    return Math.sign(
      (next.x - point.x) * (afterNext.y - next.y) - (next.y - point.y) * (afterNext.x - next.x),
    );
  });
  return signs.every((sign) => sign >= 0) || signs.every((sign) => sign <= 0);
};

const bounds = (polygon: WorldPolygon): WorldRect => {
  const xs = polygon.map((point) => point.x);
  const ys = polygon.map((point) => point.y);
  return {
    x: Math.min(...xs),
    y: Math.min(...ys),
    width: Math.max(...xs) - Math.min(...xs),
    height: Math.max(...ys) - Math.min(...ys),
  };
};

/**
 * ADR 0007: the sprite's alpha box is exactly the collider footprint. For a
 * polygon collider this means its bounding box fills the declared footprint
 * on all four sides.
 */
export const expectPolygonToFillFootprint = (polygon: WorldPolygon, footprint: WorldRect): void => {
  expect(polygon.length).toBeGreaterThanOrEqual(3);
  expect(polygon.length).toBeLessThanOrEqual(MAX_POLYGON_VERTICES);
  expect(isConvex(polygon)).toBe(true);

  const actual = bounds(polygon);
  expect(Math.abs(actual.x - footprint.x)).toBeLessThanOrEqual(MEASUREMENT_TOLERANCE);
  expect(Math.abs(actual.y - footprint.y)).toBeLessThanOrEqual(MEASUREMENT_TOLERANCE);
  expect(Math.abs(actual.width - footprint.width)).toBeLessThanOrEqual(MEASUREMENT_TOLERANCE);
  expect(Math.abs(actual.height - footprint.height)).toBeLessThanOrEqual(MEASUREMENT_TOLERANCE);
};

describe('géométrie des familles', () => {
  it('pose le pied de la bascule sous le tablier, sans le traverser', () => {
    const { board, fulcrum } = seesawGeometry;

    expect(fulcrum.footprint.y).toBeCloseTo(board.halfThickness);
    expectPolygonToFillFootprint(fulcrum.polygon, fulcrum.footprint);
  });

  it('donne à la masse un collider qui remplit son empreinte', () => {
    expect(massGeometry.footprint.width).toBe(0.8);
    expectPolygonToFillFootprint(massGeometry.polygon, massGeometry.footprint);
  });

  it('donne au socle du levier un collider qui remplit son empreinte', () => {
    expectPolygonToFillFootprint(leverGeometry.base.polygon, leverGeometry.base.footprint);
  });

  it('élargit l’empreinte du levier du côté où penche sa poignée', () => {
    const center = leverFootprint('center');
    const right = leverFootprint('right');
    const left = leverFootprint('left');

    expect(center.x).toBeCloseTo(-0.4);
    expect(center.width).toBeCloseTo(0.8);
    expect(right.x + right.width).toBeGreaterThan(0.6);
    expect(left.x).toBeCloseTo(-(right.x + right.width));
    expect(right.y).toBeGreaterThan(center.y);
  });

  it('garde l’empreinte d’ensemble de la bascule figée par A4', () => {
    expect(seesawGeometry.footprint).toEqual({ x: -1.5, y: -0.12, width: 3, height: 0.82 });
  });
});

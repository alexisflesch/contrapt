import { describe, expect, it } from 'vitest';

import type { WorldPoint, WorldRect } from '../domain/family-geometry';
import { findWireBridges, routeWire, type WirePort } from './control-wires';

const port = (x: number, y: number, side: -1 | 1): WirePort => ({ position: { x, y }, side });

const isOrthogonal = (points: readonly WorldPoint[]): boolean =>
  points.every((point, index) => {
    const next = points[index + 1];
    return next === undefined || point.x === next.x || point.y === next.y;
  });

const bends = (points: readonly WorldPoint[]): number => Math.max(0, points.length - 2);

/** Does any segment of the route cross the inside of `rect`? */
const crosses = (points: readonly WorldPoint[], rect: WorldRect): boolean =>
  points.some((point, index) => {
    const next = points[index + 1];
    if (next === undefined) return false;
    const minX = Math.min(point.x, next.x);
    const maxX = Math.max(point.x, next.x);
    const minY = Math.min(point.y, next.y);
    const maxY = Math.max(point.y, next.y);
    return (
      maxX > rect.x && minX < rect.x + rect.width && maxY > rect.y && minY < rect.y + rect.height
    );
  });

describe('routage des fils', () => {
  it('relie deux ports face à face par des segments orthogonaux et peu de virages', () => {
    const route = routeWire(port(0.4, 0, 1), port(3.5, 2, -1), []);

    expect(route[0]).toEqual({ x: 0.4, y: 0 });
    expect(route.at(-1)).toEqual({ x: 3.5, y: 2 });
    expect(isOrthogonal(route)).toBe(true);
    expect(bends(route)).toBeLessThanOrEqual(2);
  });

  it('reste droit quand les deux ports sont alignés', () => {
    expect(routeWire(port(0, 1, 1), port(4, 1, -1), [])).toEqual([
      { x: 0, y: 1 },
      { x: 4, y: 1 },
    ]);
  });

  it('déplace la descente verticale pour ne pas traverser un objet', () => {
    const obstacle = { x: 1.6, y: -1, width: 0.8, height: 4 };
    const route = routeWire(port(0.4, 0, 1), port(3.5, 2, -1), [obstacle]);

    expect(isOrthogonal(route)).toBe(true);
    expect(crosses(route, obstacle)).toBe(false);
  });

  it('contourne quand la cible est derrière le port de départ', () => {
    const route = routeWire(port(0.4, 0, 1), port(-2, 3, 1), []);

    expect(route[0]).toEqual({ x: 0.4, y: 0 });
    expect(route.at(-1)).toEqual({ x: -2, y: 3 });
    expect(isOrthogonal(route)).toBe(true);
    // The route leaves each port on its own side before turning.
    expect(route[1]?.x).toBeGreaterThan(0.4);
    expect(route.at(-2)?.x).toBeGreaterThan(-2);
  });
});

describe('ponts entre fils', () => {
  it('fait passer le fil le plus récent par-dessus, au point de croisement', () => {
    const older = [
      { x: 2, y: -2 },
      { x: 2, y: 2 },
    ];
    const newer = [
      { x: 0, y: 0 },
      { x: 4, y: 0 },
    ];

    expect(findWireBridges([older, newer])).toEqual([[], [{ x: 2, y: 0 }]]);
  });

  it('ne fait pas de pont entre deux fils qui se touchent sans se croiser', () => {
    const first = [
      { x: 0, y: 0 },
      { x: 2, y: 0 },
    ];
    const second = [
      { x: 2, y: 0 },
      { x: 2, y: 2 },
    ];

    expect(findWireBridges([first, second])).toEqual([[], []]);
  });
});

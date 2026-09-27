import { describe, expect, it } from 'vitest';

import { embeddedLevels } from '../embedded-levels';
import { applyPlayerSteps, runLevel, searchSolutions, type PlayerStep } from '../level-regression';
import type { LevelDocument } from '../../domain/level-document';

/**
 * Measured on the development PC (27 September 2026): the cross product takes
 * 2.1 s alone and 4.3 s inside the full suite, the one-object search 9.4 s
 * alone and 11.3 s inside it. Each limit leaves about five times the loaded
 * cost, so a busy machine does not turn a slow run into a failure.
 */
const CROSS_PRODUCT_TIMEOUT_MS = 20_000;
const ONE_OBJECT_SEARCH_TIMEOUT_MS = 60_000;

const readLevel = (): LevelDocument => {
  const level = embeddedLevels.find(({ id }) => id === 'level-12-le-bon-ordre');
  if (level === undefined) throw new Error('Le niveau « Le bon ordre » est absent.');
  return level;
};

const placeMass = (x: number, y: number): PlayerStep => ({
  kind: 'place',
  inventoryEntryId: 'inventory-mass',
  placementId: 'placed-mass',
  x,
  y,
});

const placeBeam = (x: number, y: number, rotationDegrees = 0): PlayerStep => ({
  kind: 'place',
  inventoryEntryId: 'inventory-beam',
  placementId: 'placed-beam',
  x,
  y,
  rotationDegrees,
});

const rotateBeam = (rotationDegrees: number): PlayerStep => ({
  kind: 'rotate',
  placementId: 'placed-beam',
  rotationDegrees,
});

const referenceSteps = (): readonly PlayerStep[] => [
  placeMass(6.0, 0.8),
  placeBeam(4.7, 2.7),
  rotateBeam(30),
];

const massWindow = (): readonly PlayerStep[] =>
  [5.9, 6.1, 6.4].flatMap((x) => [0.8, 1.2, 1.6].map((y) => placeMass(x, y)));

const beamWindow = (): readonly PlayerStep[] =>
  [
    { y: 2.5, minX: 4.2, maxX: 4.7 },
    { y: 2.6, minX: 4.4, maxX: 4.8 },
    { y: 2.7, minX: 4.6, maxX: 4.9 },
    { y: 2.8, minX: 4.8, maxX: 4.9 },
  ].flatMap(({ y, minX, maxX }) => {
    const candidates: PlayerStep[] = [];
    for (let step = Math.round(minX * 10); step <= Math.round(maxX * 10); step += 1) {
      candidates.push(placeBeam(step / 10, y, 30));
    }
    return candidates;
  });

const oneObjectGrid = (): readonly PlayerStep[] => {
  const candidates: PlayerStep[] = [];
  for (let xIndex = 0; xIndex < 18; xIndex += 1) {
    for (let yIndex = 0; yIndex < 8; yIndex += 1) {
      candidates.push(placeMass(0.4 + xIndex * 0.4, 0.7 + yIndex * 0.4));
    }
  }
  for (let xIndex = 0; xIndex < 11; xIndex += 1) {
    for (let yIndex = 0; yIndex < 3; yIndex += 1) {
      for (let turn = 0; turn < 24; turn += 1) {
        candidates.push(placeBeam(1.4 + xIndex * 0.5, 1.5 + yIndex * 0.5, turn * 15));
      }
    }
  }
  return candidates;
};

const device = (levelRun: ReturnType<typeof runLevel>, placementId: string) => {
  const found = levelRun.finalState.devices.find(
    (candidate) => candidate.placementId === placementId,
  );
  if (found === undefined) throw new Error(`Dispositif absent de l’état : ${placementId}`);
  return found;
};

const expectBallCentreInBasket = (
  levelRun: ReturnType<typeof runLevel>,
  level: LevelDocument,
): void => {
  const basket = level.objects.find(({ id }) => id === 'basket-1');
  const ball = levelRun.finalState.bodies.find(({ placementId }) => placementId === 'ball-1');
  if (basket === undefined || basket.type !== 'basket' || ball === undefined) {
    throw new Error('Le panier et la balle cible doivent être dans l’état final.');
  }
  expect(ball.position.x).toBeGreaterThanOrEqual(basket.transform.position.x - 0.75);
  expect(ball.position.x).toBeLessThanOrEqual(basket.transform.position.x + 0.75);
  expect(ball.position.y).toBeGreaterThanOrEqual(basket.transform.position.y - 0.5);
  expect(ball.position.y).toBeLessThanOrEqual(basket.transform.position.y + 0.5);
};

describe('niveau 12 — Le bon ordre', () => {
  it('échoue sans action : le levier reste au centre et le convoyeur arrêté', () => {
    const run = runLevel(readLevel());

    expect(run.outcome).toBe('timed-out');
    expect(device(run, 'lever')).toMatchObject({ kind: 'lever', position: 'center' });
    expect(device(run, 'belt')).toMatchObject({ kind: 'conveyor', direction: 0 });
  });

  it('gagne avec la référence, dans l’ordre causal masse puis poutre tournée', () => {
    const level = readLevel();
    const initialDocument = structuredClone(level);
    const solved = applyPlayerSteps(level, referenceSteps());
    const result = runLevel(solved);

    expect(result.outcome).toBe('succeeded');
    expect(result.ballEnteredTarget).toBe(true);
    expectBallCentreInBasket(result, level);
    expect(device(result, 'lever')).toMatchObject({ kind: 'lever', position: 'right' });
    expect(device(result, 'belt')).toMatchObject({ kind: 'conveyor', direction: 1 });
    expect(level).toEqual(initialDocument);
  });

  it(
    'gagne sur le produit croisé complet des fenêtres de masse et de poutre',
    () => {
      const masses = massWindow();
      const beams = beamWindow();
      const solutions = searchSolutions(readLevel(), [masses, beams]);

      expect(masses).toHaveLength(9);
      expect(beams).toHaveLength(17);
      expect(solutions).toHaveLength(153);
    },
    CROSS_PRODUCT_TIMEOUT_MS,
  );

  it('échoue avec la masse seule et avec la poutre seule', () => {
    const level = readLevel();
    const massOnly = runLevel(applyPlayerSteps(level, [placeMass(6.0, 0.8)]));
    const beamOnly = runLevel(applyPlayerSteps(level, [placeBeam(4.7, 2.7), rotateBeam(30)]));

    expect(massOnly.outcome).toBe('timed-out');
    expect(device(massOnly, 'lever')).toMatchObject({ kind: 'lever', position: 'right' });
    expect(device(massOnly, 'belt')).toMatchObject({ kind: 'conveyor', direction: 1 });
    expect(beamOnly.outcome).toBe('timed-out');
    expect(device(beamOnly, 'lever')).toMatchObject({ kind: 'lever', position: 'center' });
    expect(device(beamOnly, 'belt')).toMatchObject({ kind: 'conveyor', direction: 0 });
  });

  it('produit le même résultat et le même nombre de pas pour deux exécutions', () => {
    const solved = applyPlayerSteps(readLevel(), referenceSteps());
    const first = runLevel(solved);
    const second = runLevel(solved);

    expect(first.outcome).toBe('succeeded');
    expect(second.outcome).toBe(first.outcome);
    expect(second.fixedSteps).toBe(first.fixedSteps);
  });

  it(
    'ne trouve aucune solution à un objet sur la grille légale de 936 poses',
    () => {
      const candidates = oneObjectGrid();

      expect(candidates).toHaveLength(936);
      expect(searchSolutions(readLevel(), [candidates])).toEqual([]);
    },
    ONE_OBJECT_SEARCH_TIMEOUT_MS,
  );

  it('déclare le minimum deux et quatre objets d’inventaire', () => {
    const level = readLevel();

    expect(level.challenge).toEqual({ elegantObjectCount: 3, minimalObjectCount: 2 });
    expect(level.inventory.reduce((total, entry) => total + entry.quantity, 0)).toBe(4);
  });
});

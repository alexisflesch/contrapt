import { describe, expect, it } from 'vitest';

import { embeddedLevels } from '../embedded-levels';
import { applyPlayerSteps, runLevel, searchSolutions, type PlayerStep } from '../level-regression';
import type { LevelDocument } from '../../domain/level-document';
import { createSimulationSession } from '../../simulation/simulation-session';

const readLevel = (): LevelDocument => {
  const level = embeddedLevels.find(({ id }) => id === 'level-3-incliner');
  if (level === undefined) throw new Error('Le niveau « Incliner » est absent.');
  return level;
};

const placement = (x: number, y: number): PlayerStep => ({
  kind: 'place',
  inventoryEntryId: 'inventory-beam',
  placementId: 'inclined-beam',
  x,
  y,
});

const rotation = (rotationDegrees: number): PlayerStep => ({
  kind: 'rotate',
  placementId: 'inclined-beam',
  rotationDegrees,
});

const referenceSteps = (): readonly PlayerStep[] => [placement(3.2, 2.5), rotation(15)];

const playerAccessiblePlacements = (coordinates: readonly (readonly [number, number])[]) =>
  coordinates.map(([x, y]) => placement(x, y));

/** Tests a measured physics pose directly when its full footprint is outside the player zone. */
const directPhysicsRun = (x: number, y: number, rotationDegrees: number) => {
  const level = readLevel();
  const beam: LevelDocument['objects'][number] = {
    id: 'inclined-beam',
    type: 'beam',
    transform: {
      position: { x, y },
      rotation: (rotationDegrees * Math.PI) / 180,
    },
    props: { size: 'medium' },
    permissions: { move: true, rotate: true, remove: true },
  };

  return runLevel({ ...level, inventory: [], objects: [...level.objects, beam] });
};

describe('niveau 3 — Incliner', () => {
  it('échoue sans action et ne modifie pas le document', () => {
    const level = readLevel();
    const initialDocument = structuredClone(level);

    const result = runLevel(level);

    expect(result.outcome).toBe('out-of-scene');
    expect(level).toEqual(initialDocument);
  });

  it('gagne après avoir posé puis tourné la poutre de référence avec la poignée', () => {
    const level = readLevel();
    const initialDocument = structuredClone(level);
    const solved = applyPlayerSteps(level, referenceSteps());
    const solvedDocument = structuredClone(solved);

    const result = runLevel(solved);

    expect(result.outcome).toBe('succeeded');
    expect(result.ballEnteredTarget).toBe(true);
    expect(solved.objects).toContainEqual(
      expect.objectContaining({
        id: 'inclined-beam',
        type: 'beam',
        transform: {
          position: { x: 3.2, y: 2.5 },
          rotation: Math.PI / 12,
        },
        props: { size: 'medium' },
        permissions: { move: true, rotate: true, remove: true },
      }),
    );
    expect(level).toEqual(initialDocument);
    expect(solved).toEqual(solvedDocument);
  });

  it('réussit sur toutes les positions mesurées qui restent dans la zone de construction', () => {
    const atFifteenDegrees = playerAccessiblePlacements([
      [2.8, 2.0],
      [2.8, 2.5],
      [2.8, 3.0],
      [3.2, 2.0],
      [3.2, 2.5],
      [3.2, 3.0],
    ]);
    const atThirtyDegrees = playerAccessiblePlacements([[3.2, 2.5]]);

    const fifteenDegreeSolutions = searchSolutions(readLevel(), [atFifteenDegrees, [rotation(15)]]);
    const thirtyDegreeSolutions = searchSolutions(readLevel(), [atThirtyDegrees, [rotation(30)]]);

    expect(fifteenDegreeSolutions).toEqual(
      atFifteenDegrees.map((candidate) => [candidate, rotation(15)]),
    );
    expect(thirtyDegreeSolutions).toEqual(
      atThirtyDegrees.map((candidate) => [candidate, rotation(30)]),
    );
  });

  it('conserve les contre-exemples physiques mesurés', () => {
    expect(runLevel(applyPlayerSteps(readLevel(), [placement(2.8, 2.5)])).outcome).toBe(
      'timed-out',
    );
    expect(directPhysicsRun(3.6, 2.0, 15).outcome).toBe('succeeded');
    expect(directPhysicsRun(3.6, 2.5, 15).outcome).toBe('succeeded');
    expect(directPhysicsRun(3.6, 3.0, 15).outcome).toBe('succeeded');
    expect(directPhysicsRun(3.2, 2.5, 30).outcome).toBe('succeeded');
    expect(directPhysicsRun(3.2, 3.0, 30).outcome).toBe('succeeded');
    expect(directPhysicsRun(3.2, 2.5, 45).outcome).not.toBe('succeeded');
    expect(
      runLevel(applyPlayerSteps(readLevel(), [placement(3.2, 2.5), rotation(-15)])).outcome,
    ).not.toBe('succeeded');
  });

  it('refuse les poses physiquement mesurées mais dont l’empreinte sort de la zone', () => {
    expect(() => applyPlayerSteps(readLevel(), [placement(3.6, 2.5)])).toThrow(
      /outside-build-zone/,
    );
    expect(() => applyPlayerSteps(readLevel(), [placement(3.2, 3.0), rotation(30)])).toThrow(
      /outside-build-zone/,
    );
    expect(() => applyPlayerSteps(readLevel(), [placement(3.2, 2.5), rotation(45)])).toThrow(
      /outside-build-zone/,
    );
  });

  it('produit le même résultat pour deux exécutions de la référence', () => {
    const solved = applyPlayerSteps(readLevel(), referenceSteps());

    const firstRun = runLevel(solved);
    const secondRun = runLevel(solved);

    expect(secondRun.fixedSteps).toBe(firstRun.fixedSteps);
    expect(secondRun.outcome).toBe(firstRun.outcome);
  });

  it('restaure exactement le snapshot initial après le succès puis le reset', () => {
    const solved = applyPlayerSteps(readLevel(), referenceSteps());
    const session = createSimulationSession(solved, { fixedStepSeconds: 1 / 60 });
    const initialSnapshot = session.readState();

    try {
      for (let fixedStep = 0; fixedStep < 1_300; fixedStep += 1) {
        if (
          session.readGoalEvaluation().status !== 'pending' ||
          session.readFailureEvaluation().status !== 'pending'
        ) {
          break;
        }
        session.advanceFixedSteps(1);
      }

      expect(session.readGoalEvaluation().status).toBe('succeeded');

      session.reset();

      expect(session.readState()).toEqual(initialSnapshot);
      expect(session.readGoalEvaluation().status).toBe('pending');
    } finally {
      session.destroy();
    }
  });
});

import { describe, expect, it } from 'vitest';

import { embeddedLevels } from '../embedded-levels';
import { applyPlayerSteps, runLevel, searchSolutions, type PlayerStep } from '../level-regression';
import type { LevelDocument } from '../../domain/level-document';
import { createSimulationSession } from '../../simulation/simulation-session';

const readLevel = (): LevelDocument => {
  const level = embeddedLevels.find(({ id }) => id === 'level-2-le-pont');
  if (level === undefined) throw new Error('Le niveau « Le pont » est absent.');
  return level;
};

const placement = (x: number, y: number): PlayerStep => ({
  kind: 'place',
  inventoryEntryId: 'inventory-beam',
  placementId: 'bridge-beam',
  x,
  y,
});

const placeAndMoveToReference = (): readonly PlayerStep[] => [
  placement(2.8, 1.95),
  { kind: 'move', placementId: 'bridge-beam', x: 3.3, y: 1.95 },
];

const robustnessPlacements = (): readonly PlayerStep[] => {
  const placements: PlayerStep[] = [];
  for (const x of [2.8, 2.9, 3.1, 3.3]) {
    for (const y of [1.7, 1.8, 1.9, 2.0, 2.1, 2.2]) {
      placements.push(placement(x, y));
    }
  }
  for (const x of [3.5, 3.7, 3.8]) {
    for (const y of [1.8, 1.9, 2.0, 2.1, 2.2]) {
      placements.push(placement(x, y));
    }
  }
  return placements;
};

describe('niveau 2 — Le pont', () => {
  it('échoue sans poutre et ne modifie pas le document', () => {
    const level = readLevel();
    const initialDocument = structuredClone(level);

    const result = runLevel(level);

    expect(result.outcome).not.toBe('succeeded');
    expect(level).toEqual(initialDocument);
  });

  it('gagne après avoir posé puis glissé la poutre à la référence', () => {
    const level = readLevel();
    const initialDocument = structuredClone(level);
    const solved = applyPlayerSteps(level, placeAndMoveToReference());
    const solvedDocument = structuredClone(solved);

    const result = runLevel(solved);

    expect(result.outcome).toBe('succeeded');
    expect(result.ballEnteredTarget).toBe(true);
    expect(solved.objects).toContainEqual(
      expect.objectContaining({
        id: 'bridge-beam',
        type: 'beam',
        transform: { position: { x: 3.3, y: 1.95 }, rotation: 0 },
        permissions: { move: true, rotate: false, remove: true },
      }),
    );
    expect(level).toEqual(initialDocument);
    expect(solved).toEqual(solvedDocument);
  });

  it('réussit à chaque position de la fenêtre de robustesse mesurée', () => {
    const candidates = robustnessPlacements();
    const solutions = searchSolutions(readLevel(), [candidates]);

    expect(candidates).toHaveLength(39);
    expect(solutions).toEqual(candidates.map((candidate) => [candidate]));
  });

  it('refuse une pose qui déborde de la zone et toute rotation joueur', () => {
    const level = readLevel();
    const initialDocument = structuredClone(level);

    expect(() => applyPlayerSteps(level, [placement(2.6, 1.95)])).toThrow(/outside-build-zone/);
    expect(() =>
      applyPlayerSteps(level, [
        placement(3.3, 1.95),
        { kind: 'rotate', placementId: 'bridge-beam', rotationDegrees: 15 },
      ]),
    ).toThrow(/rotate-not-permitted/);
    expect(level).toEqual(initialDocument);
  });

  it('produit le même résultat pour deux exécutions de la référence', () => {
    const solved = applyPlayerSteps(readLevel(), placeAndMoveToReference());

    const firstRun = runLevel(solved);
    const secondRun = runLevel(solved);

    expect(secondRun.fixedSteps).toBe(firstRun.fixedSteps);
    expect(secondRun.outcome).toBe(firstRun.outcome);
  });

  it('restaure exactement le snapshot initial après le succès puis le reset', () => {
    const solved = applyPlayerSteps(readLevel(), placeAndMoveToReference());
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

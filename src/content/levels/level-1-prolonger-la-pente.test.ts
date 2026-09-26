import { describe, expect, it } from 'vitest';

import { embeddedLevels } from '../embedded-levels';
import { applyPlayerSteps, runLevel, searchSolutions, type PlayerStep } from '../level-regression';
import type { LevelDocument } from '../../domain/level-document';
import { createSimulationSession } from '../../simulation/simulation-session';

const readLevel = (): LevelDocument => {
  const level = embeddedLevels.find(({ id }) => id === 'level-1-prolonger-la-pente');
  if (level === undefined) throw new Error('Le niveau « Prolonger la pente » est absent.');
  return level;
};

const placement = (x: number, y: number): PlayerStep => ({
  kind: 'place',
  inventoryEntryId: 'inventory-beam',
  placementId: 'player-beam',
  x,
  y,
});

const robustnessPlacements = (): readonly PlayerStep[] => {
  const placements: PlayerStep[] = [];
  for (const x of [4.9, 5.0, 5.1]) {
    for (const y of [2.05, 2.125, 2.2, 2.3]) placements.push(placement(x, y));
  }
  for (const x of [5.2, 5.3, 5.4]) {
    for (const y of [2.125, 2.2, 2.3]) placements.push(placement(x, y));
  }
  return placements;
};

describe('niveau 1 — Prolonger la pente', () => {
  it('échoue sans action du joueur et ne modifie pas le document', () => {
    const level = readLevel();
    const initialDocument = structuredClone(level);

    const result = runLevel(level);

    expect(result.outcome).not.toBe('succeeded');
    expect(level).toEqual(initialDocument);
  });

  it('gagne avec la poutre courte de référence via les commandes joueur', () => {
    const level = readLevel();
    const initialDocument = structuredClone(level);
    const solved = applyPlayerSteps(level, [placement(5.0, 2.15)]);
    const solvedDocument = structuredClone(solved);

    const result = runLevel(solved);

    expect(result.outcome).toBe('succeeded');
    expect(result.ballEnteredTarget).toBe(true);
    expect(solved.objects).toContainEqual(
      expect.objectContaining({
        id: 'player-beam',
        type: 'beam',
        transform: { position: { x: 5, y: 2.15 }, rotation: 0 },
        permissions: { move: true, rotate: false, remove: true },
      }),
    );
    expect(level).toEqual(initialDocument);
    expect(solved).toEqual(solvedDocument);
  });

  it('réussit à chaque position de la fenêtre de robustesse mesurée', () => {
    const candidates = robustnessPlacements();
    const solutions = searchSolutions(readLevel(), [candidates]);

    expect(candidates).toHaveLength(21);
    expect(solutions).toEqual(candidates.map((candidate) => [candidate]));
  });

  it.each([
    ['trop loin', 5.6, 2.125],
    ['plus haut que la fin de pente', 5.3, 2.05],
  ])('refuse le contre-exemple %s', (_description, x, y) => {
    const result = runLevel(applyPlayerSteps(readLevel(), [placement(x, y)]));

    expect(result.outcome).not.toBe('succeeded');
  });

  it('refuse une poutre qui déborde de la zone et toute rotation joueur', () => {
    const level = readLevel();

    expect(() => applyPlayerSteps(level, [placement(3.6, 2.15)])).toThrow(/outside-build-zone/);
    expect(() =>
      applyPlayerSteps(level, [
        placement(5.0, 2.15),
        { kind: 'rotate', placementId: 'player-beam', rotationDegrees: 15 },
      ]),
    ).toThrow(/rotate-not-permitted/);
  });

  it('produit le même nombre de pas pour deux exécutions de la référence', () => {
    const solved = applyPlayerSteps(readLevel(), [placement(5.0, 2.15)]);

    const firstRun = runLevel(solved);
    const secondRun = runLevel(solved);

    expect(secondRun.fixedSteps).toBe(firstRun.fixedSteps);
    expect(secondRun.outcome).toBe(firstRun.outcome);
  });

  it('restaure exactement le snapshot initial après le succès puis le reset', () => {
    const solved = applyPlayerSteps(readLevel(), [placement(5.0, 2.15)]);
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

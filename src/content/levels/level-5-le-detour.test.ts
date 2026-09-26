import { describe, expect, it } from 'vitest';

import { embeddedLevels } from '../embedded-levels';
import { applyPlayerSteps, runLevel, searchSolutions, type PlayerStep } from '../level-regression';
import type { LevelDocument } from '../../domain/level-document';
import { createSimulationSession } from '../../simulation/simulation-session';

const readLevel = (): LevelDocument => {
  const level = embeddedLevels.find(({ id }) => id === 'level-5-le-detour');
  if (level === undefined) throw new Error('Le niveau « Le détour » est absent.');
  return level;
};

const placement = (
  size: 'short' | 'medium',
  placementId: string,
  x: number,
  y: number,
  rotationDegrees = 0,
): PlayerStep => ({
  kind: 'place',
  inventoryEntryId: `inventory-beam-${size}`,
  placementId,
  x,
  y,
  rotationDegrees,
});

const reference = (): readonly PlayerStep[] => [
  placement('short', 'detour-upper-beam', 2.3, 1.4, 10),
  placement('medium', 'detour-return-beam', 3.8, 3.5, -15),
];

const evenlySpaced = (minimum: number, maximum: number, step: number): readonly number[] =>
  Array.from({ length: Math.round((maximum - minimum) / step) + 1 }, (_, index) =>
    Number((minimum + index * step).toFixed(10)),
  );

const oneBeamCandidates = (): readonly PlayerStep[] =>
  (['short', 'medium'] as const).flatMap((size) =>
    evenlySpaced(-45, 90, 15).flatMap((angle) =>
      evenlySpaced(0.4, 4.8, 0.4).flatMap((x) =>
        evenlySpaced(1, 4, 0.5).map((y) => placement(size, 'single-detour-beam', x, y, angle)),
      ),
    ),
  );

const directPhysicsRun = (steps: readonly PlayerStep[]) => {
  const level = readLevel();

  return runLevel({
    ...level,
    challenge: undefined,
    objects: [
      ...level.objects,
      ...steps.map((step): LevelDocument['objects'][number] => {
        if (step.kind !== 'place')
          throw new Error('Une pose est attendue pour la mesure physique.');
        const size =
          step.inventoryEntryId === 'inventory-beam-short'
            ? 'short'
            : step.inventoryEntryId === 'inventory-beam-medium'
              ? 'medium'
              : undefined;
        if (size === undefined) throw new Error('L’entrée de poutre est inconnue.');

        return {
          id: step.placementId,
          type: 'beam',
          props: { size },
          transform: {
            position: { x: step.x, y: step.y },
            rotation: ((step.rotationDegrees ?? 0) * Math.PI) / 180,
          },
          permissions: { move: true, rotate: true, remove: true },
        };
      }),
    ],
  });
};

describe('niveau 5 — Le détour', () => {
  it('ne gagne pas sans action', () => {
    expect(runLevel(readLevel()).outcome).toBe('timed-out');
  });

  it('gagne avec les deux poutres de référence posées par le joueur', () => {
    const level = readLevel();
    const initialDocument = structuredClone(level);
    const solved = applyPlayerSteps(level, reference());

    expect(runLevel(solved).outcome).toBe('succeeded');
    expect(level).toEqual(initialDocument);
  });

  it('gagne dans toutes les combinaisons mesurées que les zones acceptent', () => {
    const firstBeamCandidates = [10, 15].map((angle) =>
      placement('short', 'detour-upper-beam', 2.3, 1.4, angle),
    );
    const secondBeamCandidates = [3.8, 4.2].flatMap((x) =>
      [3.2, 3.5, 3.8].flatMap((y) =>
        [-10, -15, -20].map((angle) => placement('medium', 'detour-return-beam', x, y, angle)),
      ),
    );
    const solutions = searchSolutions(readLevel(), [firstBeamCandidates, secondBeamCandidates]);

    expect(solutions).toContainEqual(reference());
    expect(solutions.length).toBeGreaterThan(0);
    expect(solutions).toHaveLength(16);
  });

  it('gagne avec les deux positions atteignables aux rotations tactiles de 15°', () => {
    const firstBeam = placement('short', 'detour-upper-beam', 2.3, 1.4, 15);
    const secondBeamCandidates = [3.8, 4.2].map((x) =>
      placement('medium', 'detour-return-beam', x, 3.5, -15),
    );

    expect(searchSolutions(readLevel(), [[firstBeam], secondBeamCandidates])).toHaveLength(2);
  });

  it('reproduit les 36 combinaisons de la fenêtre physique mesurée', () => {
    const outcomes = [10, 15].flatMap((firstAngle) =>
      [3.8, 4.2].flatMap((x) =>
        [3.2, 3.5, 3.8].flatMap((y) =>
          [-10, -15, -20].map(
            (secondAngle) =>
              directPhysicsRun([
                placement('short', 'detour-upper-beam', 2.3, 1.4, firstAngle),
                placement('medium', 'detour-return-beam', x, y, secondAngle),
              ]).outcome,
          ),
        ),
      ),
    );

    expect(outcomes).toHaveLength(36);
    expect(outcomes.every((outcome) => outcome === 'succeeded')).toBe(true);
  });

  it('échoue avec les contre-exemples d’une poutre courte', () => {
    expect(directPhysicsRun([placement('short', 'single-short-beam', 2.3, 1.4, 10)]).outcome).toBe(
      'out-of-scene',
    );
    expect(directPhysicsRun([placement('short', 'shifted-short-beam', 2.5, 1.5, 10)]).outcome).toBe(
      'timed-out',
    );
  });

  it('ne trouve aucune solution à une poutre sur la grille complète de 1 680 poses', () => {
    expect(readLevel().challenge).toEqual({ elegantObjectCount: 2, minimalObjectCount: 2 });
    expect(oneBeamCandidates()).toHaveLength(1_680);
    expect(searchSolutions(readLevel(), [oneBeamCandidates()])).toEqual([]);
  });

  it('produit le même nombre de pas pour deux exécutions de la référence', () => {
    const solved = applyPlayerSteps(readLevel(), reference());

    expect(runLevel(solved).fixedSteps).toBe(runLevel(solved).fixedSteps);
  });

  it('restaure le snapshot initial après le succès puis le reset', () => {
    const solved = applyPlayerSteps(readLevel(), reference());
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

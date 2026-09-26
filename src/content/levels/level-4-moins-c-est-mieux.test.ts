import { describe, expect, it } from 'vitest';

import { embeddedLevels } from '../embedded-levels';
import { applyPlayerSteps, runLevel, searchSolutions, type PlayerStep } from '../level-regression';
import type { LevelDocument } from '../../domain/level-document';
import { createSimulationSession } from '../../simulation/simulation-session';

const readLevel = (): LevelDocument => {
  const level = embeddedLevels.find(({ id }) => id === 'level-4-moins-c-est-mieux');
  if (level === undefined) throw new Error('Le niveau « Moins, c’est mieux » est absent.');
  return level;
};

const placement = (
  size: 'short' | 'long',
  placementId: string,
  x: number,
  y: number,
  rotationDegrees = 15,
): PlayerStep => ({
  kind: 'place',
  inventoryEntryId: `inventory-beam-${size}`,
  placementId,
  x,
  y,
  rotationDegrees,
});

const longReference = (): readonly PlayerStep[] => [placement('long', 'economical-beam', 3.2, 2.2)];

const twoBeamReference = (): readonly PlayerStep[] => [
  placement('short', 'first-short-beam', 1.6, 1.6),
  placement('short', 'second-short-beam', 3.8, 2.8),
];

const directPhysicsRun = (x: number, y: number, rotationDegrees: number) => {
  const level = readLevel();
  const beam: LevelDocument['objects'][number] = {
    id: 'physics-only-long-beam',
    type: 'beam',
    transform: {
      position: { x, y },
      rotation: (rotationDegrees * Math.PI) / 180,
    },
    props: { size: 'long' },
    permissions: { move: true, rotate: true, remove: true },
  };

  return runLevel({ ...level, challenge: undefined, objects: [...level.objects, beam] });
};

describe('niveau 4 — Moins, c’est mieux', () => {
  it('échoue sans action et ne modifie pas le document', () => {
    const level = readLevel();
    const initialDocument = structuredClone(level);

    const result = runLevel(level);

    expect(result.outcome).toBe('out-of-scene');
    expect(level).toEqual(initialDocument);
  });

  it('gagne avec la référence économique d’une poutre longue', () => {
    const level = readLevel();
    const initialDocument = structuredClone(level);
    const solved = applyPlayerSteps(level, longReference());

    const result = runLevel(solved);

    expect(result.outcome).toBe('succeeded');
    expect(result.ballEnteredTarget).toBe(true);
    expect(solved.objects).toContainEqual(
      expect.objectContaining({
        id: 'economical-beam',
        type: 'beam',
        transform: {
          position: { x: 3.2, y: 2.2 },
          rotation: Math.PI / 12,
        },
        props: { size: 'long' },
      }),
    );
    expect(level).toEqual(initialDocument);
  });

  it('gagne avec la référence élégante de deux poutres courtes', () => {
    const solved = applyPlayerSteps(readLevel(), twoBeamReference());

    const result = runLevel(solved);

    expect(result.outcome).toBe('succeeded');
    expect(result.ballEnteredTarget).toBe(true);
    expect(solved.objects.filter(({ id }) => id.endsWith('short-beam'))).toHaveLength(2);
  });

  it('réussit dans les fenêtres mesurées des deux références', () => {
    const longCandidates = [
      ...[2.2, 2.6].map((y) => placement('long', 'long-beam', 3.2, y)),
      placement('long', 'long-beam', 3.2, 2.2, 10),
      placement('long', 'long-beam', 3.2, 2.2, 20),
    ];
    const firstShort = placement('short', 'first-short-beam', 1.6, 1.6);
    const secondShortCandidates = [3.6, 4.0].flatMap((x) =>
      [2.4, 2.8, 3.2].flatMap((y) =>
        [15, 20].map((angle) => placement('short', 'second-short-beam', x, y, angle)),
      ),
    );
    const accessibleSecondCandidates = secondShortCandidates.filter(
      (candidate) =>
        candidate.kind !== 'place' ||
        !(candidate.x === 3.6 && candidate.y === 3.2 && candidate.rotationDegrees === 20),
    );

    expect(searchSolutions(readLevel(), [longCandidates])).toEqual(
      longCandidates.map((candidate) => [candidate]),
    );
    expect(searchSolutions(readLevel(), [[firstShort], accessibleSecondCandidates])).toEqual(
      accessibleSecondCandidates.map((candidate) => [firstShort, candidate]),
    );
    expect(
      runLevel(
        applyPlayerSteps(readLevel(), [
          firstShort,
          placement('short', 'second-short-beam', 3.6, 3.2, 20),
        ]),
      ).outcome,
    ).not.toBe('succeeded');
  });

  it('gagne avec une pose longue intérieure adaptée au dépôt tactile', () => {
    const candidate = placement('long', 'interior-long-beam', 3.3, 2.2, 15);

    expect(searchSolutions(readLevel(), [[candidate]])).toEqual([[candidate]]);
  });

  it('distingue la mesure physique d’une pose longue hors de la zone', () => {
    expect(directPhysicsRun(3.2, 1.8, 15).outcome).toBe('succeeded');
    expect(() =>
      applyPlayerSteps(readLevel(), [placement('long', 'outside-zone-beam', 3.2, 1.8)]),
    ).toThrow(/outside-build-zone/);
  });

  it('ne trouve aucune solution à zéro objet, selon le minimum déclaré', () => {
    expect(readLevel().challenge).toEqual({ elegantObjectCount: 2, minimalObjectCount: 1 });
    expect(searchSolutions(readLevel(), [])).toEqual([]);
  });

  it('conserve les contre-exemples mesurés sans poutre et avec une poutre courte', () => {
    expect(runLevel(readLevel()).outcome).toBe('out-of-scene');

    const shortBeamCandidates = [1.2, 1.6, 2.0].flatMap((x) =>
      [1.5, 2.0, 2.5].flatMap((y) =>
        [15, 30].map((angle) => placement('short', 'short-beam', x, y, angle)),
      ),
    );
    expect(searchSolutions(readLevel(), [shortBeamCandidates])).toEqual([]);
  });

  it('produit le même résultat pour deux exécutions de chaque référence', () => {
    for (const steps of [longReference(), twoBeamReference()]) {
      const solved = applyPlayerSteps(readLevel(), steps);
      const firstRun = runLevel(solved);
      const secondRun = runLevel(solved);

      expect(secondRun.fixedSteps).toBe(firstRun.fixedSteps);
      expect(secondRun.outcome).toBe(firstRun.outcome);
    }
  });

  it('restaure exactement le snapshot initial après le succès puis le reset', () => {
    const solved = applyPlayerSteps(readLevel(), longReference());
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

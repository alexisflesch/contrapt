import { describe, expect, it } from 'vitest';

import { embeddedLevels } from '../embedded-levels';
import { applyPlayerSteps, runLevel, searchSolutions, type PlayerStep } from '../level-regression';
import type { LevelDocument } from '../../domain/level-document';

const readLevel = (): LevelDocument => {
  const level = embeddedLevels.find(({ id }) => id === 'level-10-le-butoir');
  if (level === undefined) throw new Error('Le niveau « Le butoir » est absent.');
  return level;
};

const placeMass = (x: number, y: number): PlayerStep => ({
  kind: 'place',
  inventoryEntryId: 'inventory-mass',
  placementId: 'placed-mass',
  x,
  y,
});

const reference = (): readonly PlayerStep[] => [placeMass(6.0, 3.08)];

const directPhysicsRun = (x: number, y: number): ReturnType<typeof runLevel> => {
  const level = readLevel();
  const mass: LevelDocument['objects'][number] = {
    id: 'physics-mass',
    type: 'mass',
    props: { weight: '10kg' },
    transform: { position: { x, y }, rotation: 0 },
    permissions: { move: true, rotate: false, remove: true },
  };

  return runLevel({ ...level, objects: [...level.objects, mass] });
};

describe('niveau 10 — Le butoir', () => {
  it('échoue sans masse par sortie de scène', () => {
    expect(runLevel(readLevel()).outcome).toBe('out-of-scene');
  });

  it('gagne avec la masse de référence posée par le joueur', () => {
    const level = readLevel();
    const initialDocument = structuredClone(level);
    const solved = applyPlayerSteps(level, reference());

    expect(runLevel(solved).outcome).toBe('succeeded');
    expect(level).toEqual(initialDocument);
  });

  it('gagne dans les douze combinaisons robustes de la masse', () => {
    const candidates = [5.8, 6.0, 6.2, 6.4].flatMap((x) =>
      [2.4, 2.8, 3.08].map((y) => placeMass(x, y)),
    );
    const solutions = searchSolutions(readLevel(), [candidates]);

    expect(solutions).toContainEqual(reference());
    expect(solutions).toHaveLength(12);
  });

  it('reproduit les douze mesures physiques, posées ou lâchées de plus haut', () => {
    const outcomes = [5.8, 6.0, 6.2, 6.4].flatMap((x) =>
      [2.4, 2.8, 3.08].map((y) => directPhysicsRun(x, y).outcome),
    );

    expect(outcomes).toHaveLength(12);
    expect(outcomes.every((outcome) => outcome === 'succeeded')).toBe(true);
  });

  it('documente que les deux contre-exemples latéraux gagnent aux trois hauteurs mesurées', () => {
    const outcomes = [5.6, 6.6].flatMap((x) =>
      [2.4, 2.8, 3.08].map((y) => directPhysicsRun(x, y).outcome),
    );

    expect(outcomes).toHaveLength(6);
    expect(outcomes.every((outcome) => outcome === 'succeeded')).toBe(true);
  });

  it('refuse de tourner la masse sans modifier le document', () => {
    const level = readLevel();
    const initialDocument = structuredClone(level);

    expect(() =>
      applyPlayerSteps(level, [
        ...reference(),
        { kind: 'rotate', placementId: 'placed-mass', rotationDegrees: 15 },
      ]),
    ).toThrow(/placement-not-rotatable/);
    expect(level).toEqual(initialDocument);
  });

  it('produit le même nombre de pas pour deux exécutions de la référence', () => {
    const solved = applyPlayerSteps(readLevel(), reference());
    const first = runLevel(solved);
    const second = runLevel(solved);

    expect(first.outcome).toBe('succeeded');
    expect(second.fixedSteps).toBe(first.fixedSteps);
  });
});

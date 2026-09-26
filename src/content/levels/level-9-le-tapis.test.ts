import { describe, expect, it } from 'vitest';

import { embeddedLevels } from '../embedded-levels';
import { applyPlayerSteps, runLevel, searchSolutions, type PlayerStep } from '../level-regression';
import type { LevelDocument } from '../../domain/level-document';

const readLevel = (): LevelDocument => {
  const level = embeddedLevels.find(({ id }) => id === 'level-9-le-tapis');
  if (level === undefined) throw new Error('Le niveau « Le tapis » est absent.');
  return level;
};

const placeConveyor = (x: number, y: number): PlayerStep => ({
  kind: 'place',
  inventoryEntryId: 'inventory-conveyor',
  placementId: 'placed-conveyor',
  x,
  y,
});

const reference = (): readonly PlayerStep[] => [placeConveyor(2.2, 2.2)];

const directPhysicsRun = (x: number, y: number): ReturnType<typeof runLevel> => {
  const level = readLevel();
  const conveyor: LevelDocument['objects'][number] = {
    id: 'physics-conveyor',
    type: 'conveyor',
    props: { direction: 'right' },
    transform: { position: { x, y }, rotation: 0 },
    permissions: { move: true, rotate: false, remove: true },
  };

  return runLevel({ ...level, objects: [...level.objects, conveyor] });
};

describe('niveau 9 — Le tapis', () => {
  it('échoue par temps écoulé sans convoyeur', () => {
    expect(runLevel(readLevel()).outcome).toBe('timed-out');
  });

  it('gagne avec le convoyeur de référence posé par le joueur', () => {
    const level = readLevel();
    const initialDocument = structuredClone(level);
    const solved = applyPlayerSteps(level, reference());

    expect(runLevel(solved).outcome).toBe('succeeded');
    expect(level).toEqual(initialDocument);
  });

  it('reproduit les douze combinaisons physiques mesurées', () => {
    const outcomes = [1.8, 2.2, 2.6, 3.0].flatMap((x) =>
      [1.6, 2.2, 2.6].map((y) => directPhysicsRun(x, y).outcome),
    );

    expect(outcomes).toHaveLength(12);
    expect(outcomes.every((outcome) => outcome === 'succeeded')).toBe(true);
    expect(directPhysicsRun(1.4, 1.6).outcome).toBe('succeeded');
  });

  it('gagne aux six poses de la fenêtre qui tiennent dans la zone', () => {
    const candidates = [1.8, 2.2, 2.6].flatMap((x) => [1.6, 2.2].map((y) => placeConveyor(x, y)));
    const solutions = searchSolutions(readLevel(), [candidates]);

    expect(solutions).toContainEqual(reference());
    expect(solutions).toHaveLength(6);
  });

  it('refuse les empreintes qui débordent, y compris une mesure physiquement gagnante', () => {
    expect(() => applyPlayerSteps(readLevel(), [placeConveyor(1.4, 1.6)])).toThrow(
      /outside-build-zone/,
    );
    expect(() => applyPlayerSteps(readLevel(), [placeConveyor(3.0, 2.2)])).toThrow(
      /outside-build-zone/,
    );
    expect(() => applyPlayerSteps(readLevel(), [placeConveyor(2.2, 2.6)])).toThrow(
      /outside-build-zone/,
    );
    expect(directPhysicsRun(1.4, 1.6).outcome).toBe('succeeded');
  });

  it('refuse de tourner le convoyeur sans modifier le document', () => {
    const level = readLevel();
    const initialDocument = structuredClone(level);

    expect(() =>
      applyPlayerSteps(level, [
        ...reference(),
        { kind: 'rotate', placementId: 'placed-conveyor', rotationDegrees: 15 },
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

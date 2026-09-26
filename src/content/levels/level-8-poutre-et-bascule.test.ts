import { describe, expect, it } from 'vitest';

import { embeddedLevels } from '../embedded-levels';
import { applyPlayerSteps, runLevel, searchSolutions, type PlayerStep } from '../level-regression';
import type { LevelDocument } from '../../domain/level-document';

const readLevel = (): LevelDocument => {
  const level = embeddedLevels.find(({ id }) => id === 'level-8-poutre-et-bascule');
  if (level === undefined) throw new Error('Le niveau « Poutre et bascule » est absent.');
  return level;
};

const placeBeam = (x: number, y: number, rotationDegrees: number): PlayerStep => ({
  kind: 'place',
  inventoryEntryId: 'inventory-beam-medium',
  placementId: 'upper-beam',
  x,
  y,
  rotationDegrees,
});

const placeSeesaw = (x: number, y: number): PlayerStep => ({
  kind: 'place',
  inventoryEntryId: 'inventory-seesaw',
  placementId: 'lower-seesaw',
  x,
  y,
});

const reference = (): readonly PlayerStep[] => [placeBeam(2.3, 1.5, 15), placeSeesaw(4.0, 3.4)];

const directPhysicsRun = (
  beamRotationDegrees: number,
  seesawX: number,
  seesawY: number,
): ReturnType<typeof runLevel> => {
  const level = readLevel();
  const beam: LevelDocument['objects'][number] = {
    id: 'physics-beam',
    type: 'beam',
    props: { size: 'medium' },
    transform: {
      position: { x: 2.3, y: 1.5 },
      rotation: (beamRotationDegrees * Math.PI) / 180,
    },
    permissions: { move: true, rotate: true, remove: true },
  };
  const seesaw: LevelDocument['objects'][number] = {
    id: 'physics-seesaw',
    type: 'seesaw',
    props: {},
    transform: { position: { x: seesawX, y: seesawY }, rotation: 0 },
    permissions: { move: true, rotate: false, remove: true },
  };

  return runLevel({ ...level, objects: [...level.objects, beam, seesaw] });
};

describe('niveau 8 — Poutre et bascule', () => {
  it('ne gagne pas sans action de construction', () => {
    expect(runLevel(readLevel()).outcome).toBe('out-of-scene');
  });

  it('gagne avec les deux objets de référence posés par le joueur', () => {
    const level = readLevel();
    const initialDocument = structuredClone(level);
    const solved = applyPlayerSteps(level, reference());

    expect(runLevel(solved).outcome).toBe('succeeded');
    expect(level).toEqual(initialDocument);
  });

  it('gagne sur les quinze positions et rotations de la fenêtre physique mesurée', () => {
    const seesawPoses = [
      { x: 4.0, y: 3.4 },
      { x: 4.0, y: 3.8 },
      { x: 4.3, y: 3.4 },
      { x: 4.3, y: 3.8 },
      { x: 3.7, y: 3.4 },
    ];
    const outcomes = [10, 15, 20].flatMap((beamRotation) =>
      seesawPoses.map(({ x, y }) => directPhysicsRun(beamRotation, x, y).outcome),
    );

    expect(outcomes).toHaveLength(15);
    expect(outcomes.every((outcome) => outcome === 'succeeded')).toBe(true);
  });

  it('gagne aux cinq positions de la fenêtre accessibles dans les zones', () => {
    const beam = placeBeam(2.3, 1.5, 15);
    const seesawCandidates = [
      placeSeesaw(4.0, 3.4),
      placeSeesaw(4.0, 3.8),
      placeSeesaw(4.3, 3.4),
      placeSeesaw(4.3, 3.8),
      placeSeesaw(3.7, 3.4),
    ];
    const solutions = searchSolutions(readLevel(), [[beam], seesawCandidates]);

    expect(solutions).toContainEqual(reference());
    expect(solutions).toHaveLength(5);
  });

  it('échoue sans bascule lorsque seule la poutre de référence est posée', () => {
    const level = readLevel();
    const beam: LevelDocument['objects'][number] = {
      id: 'beam-only',
      type: 'beam',
      props: { size: 'medium' },
      transform: { position: { x: 2.3, y: 1.5 }, rotation: Math.PI / 12 },
      permissions: { move: true, rotate: true, remove: true },
    };

    expect(runLevel({ ...level, objects: [...level.objects, beam] }).outcome).toBe('out-of-scene');
  });

  it('refuse une rotation de la bascule sans modifier le document', () => {
    const level = readLevel();
    const initialDocument = structuredClone(level);

    expect(() =>
      applyPlayerSteps(level, [
        ...reference(),
        { kind: 'rotate', placementId: 'lower-seesaw', rotationDegrees: 15 },
      ]),
    ).toThrow(/placement-not-rotatable/);
    expect(level).toEqual(initialDocument);
  });

  it('produit le même nombre de pas pour deux exécutions de la référence', () => {
    const solved = applyPlayerSteps(readLevel(), reference());
    const first = runLevel(solved);
    const second = runLevel(solved);

    expect(second.outcome).toBe('succeeded');
    expect(second.fixedSteps).toBe(first.fixedSteps);
  });
});

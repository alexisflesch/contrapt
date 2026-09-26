import { describe, expect, it } from 'vitest';

import { embeddedLevels } from '../embedded-levels';
import { applyPlayerSteps, runLevel, searchSolutions, type PlayerStep } from '../level-regression';
import type { LevelDocument } from '../../domain/level-document';

const readLevel = (): LevelDocument => {
  const level = embeddedLevels.find(({ id }) => id === 'level-11-l-interrupteur');
  if (level === undefined) throw new Error('Le niveau « L’interrupteur » est absent.');
  return level;
};

const placeMass = (x: number, y: number): PlayerStep => ({
  kind: 'place',
  inventoryEntryId: 'inventory-mass',
  placementId: 'placed-mass',
  x,
  y,
});

const documentedReference = (): readonly PlayerStep[] => [placeMass(6.2, 1.1)];
const measuredSolution = (): readonly PlayerStep[] => [placeMass(6.0, 0.8)];

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

const device = (run: ReturnType<typeof runLevel>, placementId: string) => {
  const found = run.finalState.devices.find((candidate) => candidate.placementId === placementId);
  if (found === undefined) throw new Error(`Dispositif absent de l’état : ${placementId}`);
  return found;
};

describe('niveau 11 — L’interrupteur', () => {
  it('échoue par temps écoulé sans masse', () => {
    expect(runLevel(readLevel()).outcome).toBe('timed-out');
  });

  it('reproduit la référence de la fiche : le levier reste au centre et la balle attend', () => {
    const run = runLevel(applyPlayerSteps(readLevel(), documentedReference()));

    expect(run.outcome).toBe('timed-out');
    expect(device(run, 'lever')).toMatchObject({ kind: 'lever', position: 'center' });
    expect(device(run, 'belt')).toMatchObject({ kind: 'conveyor', direction: 0 });
    expect(
      run.finalState.bodies.find(({ placementId }) => placementId === 'ball-1')?.position.x,
    ).toBeCloseTo(1.9);
  });

  it('gagne avec une pose mesurée à gauche du pommeau sans modifier le niveau', () => {
    const level = readLevel();
    const initialDocument = structuredClone(level);
    const run = runLevel(applyPlayerSteps(level, measuredSolution()));

    expect(run.outcome).toBe('succeeded');
    expect(level).toEqual(initialDocument);
  });

  it('mesure les six poses documentées : quatre gagnent et les deux à x = 6,2 expirent', () => {
    const candidates = [6.0, 6.2, 6.4].flatMap((x) => [0.8, 1.4].map((y) => placeMass(x, y)));
    const solutions = searchSolutions(readLevel(), [candidates]);

    expect(solutions).toHaveLength(4);
    expect(solutions).not.toContainEqual(documentedReference());
    expect(solutions).not.toContainEqual([placeMass(6.2, 0.8)]);
    expect(solutions).not.toContainEqual([placeMass(6.2, 1.4)]);
  });

  it('met le levier à droite et le convoyeur en marche avant la réussite mesurée', () => {
    const run = runLevel(applyPlayerSteps(readLevel(), measuredSolution()));

    expect(run.outcome).toBe('succeeded');
    expect(device(run, 'lever')).toMatchObject({ kind: 'lever', position: 'right' });
    expect(device(run, 'belt')).toMatchObject({ kind: 'conveyor', direction: 1 });
  });

  it('laisse le levier au centre ou à gauche pour les contre-exemples', () => {
    const tooFarLeft = directPhysicsRun(5.8, 1.1);
    const tooFarRight = directPhysicsRun(6.6, 1.1);

    expect(tooFarLeft.outcome).not.toBe('succeeded');
    expect(device(tooFarLeft, 'lever')).toMatchObject({ kind: 'lever', position: 'center' });
    expect(tooFarRight.outcome).not.toBe('succeeded');
    expect(device(tooFarRight, 'lever')).toMatchObject({ kind: 'lever', position: 'left' });
  });

  it('refuse de tourner la masse sans modifier le document', () => {
    const level = readLevel();
    const initialDocument = structuredClone(level);

    expect(() =>
      applyPlayerSteps(level, [
        ...measuredSolution(),
        { kind: 'rotate', placementId: 'placed-mass', rotationDegrees: 15 },
      ]),
    ).toThrow(/placement-not-rotatable/);
    expect(level).toEqual(initialDocument);
  });

  it('produit le même nombre de pas pour deux exécutions de la solution mesurée', () => {
    const solved = applyPlayerSteps(readLevel(), measuredSolution());
    const first = runLevel(solved);
    const second = runLevel(solved);

    expect(first.outcome).toBe('succeeded');
    expect(second.fixedSteps).toBe(first.fixedSteps);
  });
});

import { describe, expect, it } from 'vitest';

import { embeddedLevels } from '../embedded-levels';
import { applyPlayerSteps, runLevel, searchSolutions, type PlayerStep } from '../level-regression';
import type { LevelDocument } from '../../domain/level-document';
import { hitTestBoard } from '../../presentation/board-hit-test';
import { projectLevel, type BoardViewport } from '../../presentation/board-renderer';

const readLevel = (): LevelDocument => {
  const level = embeddedLevels.find(({ id }) => id === 'level-7-placer-la-bascule');
  if (level === undefined) throw new Error('Le niveau « Placer la bascule » est absent.');
  return level;
};

const placeSeesaw = (x: number, y: number): PlayerStep => ({
  kind: 'place',
  inventoryEntryId: 'inventory-seesaw',
  placementId: 'placed-seesaw',
  x,
  y,
});

const reference = (): readonly PlayerStep[] => [placeSeesaw(2.5, 3.2)];

const directPhysicsRun = (x: number, y: number) => {
  const level = readLevel();
  return runLevel({
    ...level,
    objects: [
      ...level.objects,
      {
        id: 'physics-seesaw',
        type: 'seesaw',
        props: {},
        transform: { position: { x, y }, rotation: 0 },
        permissions: { move: true, rotate: false, remove: true },
      },
    ],
  });
};

describe('niveau 7 — Placer la bascule', () => {
  it('ne gagne pas sans poser la bascule', () => {
    expect(runLevel(readLevel()).outcome).toBe('out-of-scene');
  });

  it('gagne avec la bascule de référence posée par le joueur', () => {
    const level = readLevel();
    const initialDocument = structuredClone(level);

    expect(applyPlayerSteps(level, reference()).objects).toContainEqual(
      expect.objectContaining({
        id: 'placed-seesaw',
        type: 'seesaw',
        transform: { position: { x: 2.5, y: 3.2 }, rotation: 0 },
      }),
    );
    expect(runLevel(applyPlayerSteps(level, reference())).outcome).toBe('succeeded');
    expect(level).toEqual(initialDocument);
  });

  it('gagne sur les positions robustes acceptées par la zone', () => {
    const candidates = [2.5, 2.8].flatMap((x) =>
      [2.4, 2.8, 3.2, 3.6].map((y) => placeSeesaw(x, y)),
    );
    candidates.push(...[2.4, 2.8, 3.2].map((y) => placeSeesaw(2.2, y)));

    const solutions = searchSolutions(readLevel(), [candidates]);

    expect(solutions).toContainEqual(reference());
    expect(solutions).toHaveLength(11);
  });

  it('reproduit les mesures physiques à y = 3,6 dans les poses permises par la zone', () => {
    expect([2.5, 2.8].map((x) => directPhysicsRun(x, 3.6).outcome)).toEqual([
      'succeeded',
      'succeeded',
    ]);
    expect(applyPlayerSteps(readLevel(), [placeSeesaw(2.5, 3.6)]).objects).toContainEqual(
      expect.objectContaining({ id: 'placed-seesaw' }),
    );
  });

  it('échoue sans bascule ou avec un pivot à droite de la balle', () => {
    expect(directPhysicsRun(3.2, 3.2).outcome).toBe('out-of-scene');
  });

  it('refuse de tourner la bascule sans modifier le document', () => {
    const level = readLevel();
    const initialDocument = structuredClone(level);

    expect(() =>
      applyPlayerSteps(level, [
        ...reference(),
        { kind: 'rotate', placementId: 'placed-seesaw', rotationDegrees: 15 },
      ]),
    ).toThrow(/placement-not-rotatable/);
    expect(level).toEqual(initialDocument);
  });

  it('renvoie un même identifiant sur la planche et le pied au hit-test', () => {
    const placed = applyPlayerSteps(readLevel(), reference());
    const projected = projectLevel(placed).objects;
    const viewport: BoardViewport = {
      cssWidth: 320,
      cssHeight: 240,
      origin: { x: -5.5, y: -2.8 },
      pixelsPerWorldUnit: 20,
      devicePixelRatio: 1,
    };

    expect(hitTestBoard({ x: 160, y: 120 }, projected, viewport)).toBe('placed-seesaw');
    expect(hitTestBoard({ x: 160, y: 131 }, projected, viewport)).toBe('placed-seesaw');
  });

  it('produit le même nombre de pas pour deux exécutions de la référence', () => {
    const solved = applyPlayerSteps(readLevel(), reference());

    expect(runLevel(solved).fixedSteps).toBe(runLevel(solved).fixedSteps);
  });
});

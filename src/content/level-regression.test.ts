import { describe, expect, it } from 'vitest';

import { levelDocumentSchema, type LevelDocument } from '../domain/level-document';
import { embeddedLevels } from './embedded-levels';
import {
  applyPlayerSteps,
  runLevel,
  searchSolutions,
  type LevelRun,
  type LevelRunOutcome,
  type PlayerStep,
} from './level-regression';

const levelOne = (): LevelDocument => {
  const level = embeddedLevels[0];
  if (level === undefined) throw new Error('Le niveau 1 embarqué est absent.');
  return level;
};

const levelWithInventory = (buildZones: LevelDocument['buildZones']): LevelDocument =>
  levelDocumentSchema.parse({
    ...levelOne(),
    inventory: [
      {
        id: 'test-beams',
        type: 'beam',
        props: { size: 'short' },
        quantity: 2,
        permissions: { move: true, rotate: true, remove: true },
      },
    ],
    buildZones,
  });

describe('level regression harness', () => {
  it('solves the currently embedded level 1 and records target entry', () => {
    const result: LevelRun = runLevel(levelOne());

    expect(result.outcome).toBe('succeeded');
    expect(result.ballEnteredTarget).toBe(true);
    expect(result.fixedSteps).toBe(result.finalState.fixedStep);
  });

  it('reports when the target ball leaves the scene without reaching a displaced basket', () => {
    const level = levelOne();
    const displacedBasket = levelDocumentSchema.parse({
      ...level,
      objects: level.objects.map((placement) =>
        placement.id === 'basket-1'
          ? {
              ...placement,
              transform: { ...placement.transform, position: { x: 7.5, y: 4.2 } },
            }
          : placement,
      ),
    });

    const outcome: LevelRunOutcome = runLevel(displacedBasket).outcome;
    expect(outcome).toBe('out-of-scene');
  });

  it('reports the fixed-step timeout when the ball stays in play without reaching the basket', () => {
    const level = levelOne();
    const stalledLevel = levelDocumentSchema.parse({
      ...level,
      objects: [
        ...level.objects.map((placement) =>
          placement.id === 'basket-1'
            ? {
                ...placement,
                transform: { ...placement.transform, position: { x: 7.5, y: 4.2 } },
              }
            : placement,
        ),
        {
          id: 'stopping-beam',
          type: 'beam',
          props: { size: 'medium' },
          transform: { position: { x: 4, y: 2 }, rotation: 0 },
          permissions: { move: false, rotate: false, remove: false },
        },
      ],
    });

    const result = runLevel(stalledLevel);

    expect(result.outcome).toBe('timed-out');
    expect(result.ballEnteredTarget).toBe(false);
  });

  it('uses deterministic fixed-step outcomes for repeated runs', () => {
    const level = levelOne();

    const first = runLevel(level);
    const second = runLevel(level);

    expect(second.fixedSteps).toBe(first.fixedSteps);
    expect(second.outcome).toBe(first.outcome);
  });

  it('names a refused player step and its stable construction error code', () => {
    const level = levelWithInventory([{ min: { x: 0, y: 0 }, max: { x: 1, y: 1 } }]);

    expect(() =>
      applyPlayerSteps(level, [
        {
          kind: 'place',
          inventoryEntryId: 'test-beams',
          placementId: 'outside-beam',
          x: 2,
          y: 0.5,
        },
      ]),
    ).toThrow(/L’étape 1.*outside-build-zone/);
  });

  it('converts rotation degrees before applying player steps', () => {
    const level = levelWithInventory([{ min: { x: 0, y: 0 }, max: { x: 8, y: 5.5 } }]);

    const result = applyPlayerSteps(level, [
      {
        kind: 'place',
        inventoryEntryId: 'test-beams',
        placementId: 'placed-beam',
        x: 2,
        y: 2,
        rotationDegrees: 90,
      },
    ]);

    expect(result.objects.find(({ id }) => id === 'placed-beam')?.transform.rotation).toBeCloseTo(
      Math.PI / 2,
    );
    expect(result.inventory[0]?.quantity).toBe(1);
  });

  it('finds a known player move and excludes an in-zone move that does not solve the level', () => {
    const source = levelOne();
    const level = levelDocumentSchema.parse({
      ...source,
      objects: source.objects.map((placement) =>
        placement.id === 'basket-1'
          ? {
              ...placement,
              permissions: { ...placement.permissions, move: true },
              transform: { ...placement.transform, position: { x: 6, y: 4.2 } },
            }
          : placement,
      ),
      buildZones: [{ min: { x: 0, y: 0 }, max: { x: 8, y: 5.5 } }],
    });
    const solution: PlayerStep = { kind: 'move', placementId: 'basket-1', x: 4, y: 4.2 };
    const falseCandidate: PlayerStep = { kind: 'move', placementId: 'basket-1', x: 6, y: 4.2 };

    expect(runLevel(applyPlayerSteps(level, [solution])).outcome).toBe('succeeded');
    expect(runLevel(applyPlayerSteps(level, [falseCandidate])).outcome).toBe('out-of-scene');
    expect(searchSolutions(level, [[solution, falseCandidate]])).toEqual([[solution]]);
  });

  it('searches the candidate product and filters a placement outside its build zone', () => {
    const level = levelWithInventory([{ min: { x: 0, y: 0 }, max: { x: 6, y: 5.5 } }]);
    const expected: PlayerStep = {
      kind: 'place',
      inventoryEntryId: 'test-beams',
      placementId: 'known-solution-beam',
      x: 2,
      y: 2,
    };
    const outside: PlayerStep = {
      ...expected,
      placementId: 'outside-beam',
      x: 7.5,
    };

    const solutions = searchSolutions(level, [[expected, outside]]);

    expect(solutions).toEqual([[expected]]);
  });
});

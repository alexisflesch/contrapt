import { describe, expect, it } from 'vitest';

import type { LevelDocument } from '../../domain/level-document';
import { createHistory, executeCommand, redo, undo } from '../history';
import {
  createConstructionAttempt,
  movePlacement,
  placeFromInventory,
  removePlacement,
  rotatePlacement,
  type ConstructionAttempt,
  type ConstructionContext,
  type ConstructionErrorCode,
} from './index';

const permissions = {
  move: true,
  rotate: false,
  remove: false,
} as const;

const createLevel = (): LevelDocument => ({
  schemaVersion: 2,
  id: 'construction-test',
  metadata: { title: 'Construction test' },
  objects: [
    {
      id: 'goal-ball',
      type: 'ball',
      props: {},
      transform: { position: { x: -2, y: 5 }, rotation: 0 },
      permissions,
    },
    {
      id: 'goal-basket',
      type: 'basket',
      props: {},
      transform: { position: { x: 8, y: 0 }, rotation: 0 },
      permissions,
    },
    {
      id: 'fixed-beam',
      type: 'beam',
      props: { size: 'medium' },
      transform: { position: { x: 3, y: 3 }, rotation: 0 },
      permissions: { move: false, rotate: false, remove: false },
    },
  ],
  inventory: [
    {
      id: 'short-beams',
      type: 'beam',
      props: { size: 'short' },
      quantity: 1,
      permissions: { move: true, rotate: true, remove: true },
    },
    {
      id: 'empty-seesaws',
      type: 'seesaw',
      props: {},
      quantity: 0,
      permissions: { move: true, rotate: false, remove: true },
    },
  ],
  buildZones: [{ min: { x: 0, y: 0 }, max: { x: 10, y: 10 } }],
  goal: { type: 'basket', ballId: 'goal-ball', basketId: 'goal-basket' },
  // Wide enough to still contain the author-mode moves in this file, which
  // deliberately go far outside the player build zone (up to ±20).
  scene: { min: { x: -25, y: -25 }, max: { x: 25, y: 25 } },
});

const placeBeam = (context: ConstructionContext = 'player') =>
  placeFromInventory({
    context,
    inventoryEntryId: 'short-beams',
    placementId: 'placed-beam',
    transform: { position: { x: 4, y: 5 }, rotation: 0.25 },
  });

const expectRejected = (
  result: ReturnType<ReturnType<typeof placeFromInventory>['execute']>,
  reason: ConstructionErrorCode,
): void => {
  expect(result).toEqual({ status: 'rejected', reason });
};

describe('ConstructionAttempt', () => {
  it('starts as an immutable JSON-like snapshot without modifying or aliasing the source', () => {
    const source = createLevel();

    const attempt = createConstructionAttempt(source);

    expect(attempt).toEqual({ document: source, provenance: {} });
    expect(attempt.document).not.toBe(source);
    expect(attempt.document.objects).not.toBe(source.objects);
    expect(Object.isFrozen(attempt)).toBe(true);
    expect(Object.isFrozen(attempt.document.objects)).toBe(true);
    expect(Object.isFrozen(attempt.provenance)).toBe(true);
    expect(Object.isFrozen(source)).toBe(false);
  });

  it('places from inventory atomically and records the ephemeral provenance', () => {
    const source = createLevel();
    const attempt = createConstructionAttempt(source);

    const result = placeBeam().execute(attempt);

    expect(result.status).toBe('accepted');
    if (result.status !== 'accepted') return;
    expect(result.state.document.objects.at(-1)).toEqual({
      id: 'placed-beam',
      type: 'beam',
      props: { size: 'short' },
      transform: { position: { x: 4, y: 5 }, rotation: 0.25 },
      permissions: { move: true, rotate: true, remove: true },
    });
    expect(result.state.document.inventory[0]?.quantity).toBe(0);
    expect(result.state.provenance).toEqual({ 'placed-beam': 'short-beams' });
    expect(attempt.document.inventory[0]?.quantity).toBe(1);
    expect(attempt.document.objects).toHaveLength(3);
    expect(Object.isFrozen(result.state.document.objects.at(-1))).toBe(true);
  });

  it.each([
    ['unknown-entry', 'missing-entry', 'inventory-entry-not-found'],
    ['depleted-entry', 'empty-seesaws', 'inventory-depleted'],
    ['duplicate-id', 'short-beams', 'placement-id-already-used'],
  ] as const)('rejects %s without changing the attempt', (_case, inventoryEntryId, reason) => {
    const attempt = createConstructionAttempt(createLevel());
    const before = structuredClone(attempt);
    const placementId = reason === 'placement-id-already-used' ? 'fixed-beam' : 'new-object';

    const result = placeFromInventory({
      context: 'player',
      inventoryEntryId,
      placementId,
      transform: { position: { x: 2, y: 2 }, rotation: 0 },
    }).execute(attempt);

    expectRejected(result, reason);
    expect(attempt).toEqual(before);
  });

  it('enforces build zones for the player using the placement centre', () => {
    const attempt = createConstructionAttempt(createLevel());

    const result = placeFromInventory({
      context: 'player',
      inventoryEntryId: 'short-beams',
      placementId: 'outside-beam',
      transform: { position: { x: 10.1, y: 5 }, rotation: 0 },
    }).execute(attempt);

    expectRejected(result, 'outside-build-zone');
    expect(attempt.document.inventory[0]?.quantity).toBe(1);
    expect(attempt.provenance).toEqual({});
  });

  it('lets the author place and move outside future player build zones and permissions', () => {
    const attempt = createConstructionAttempt(createLevel());
    const placed = placeFromInventory({
      context: 'author',
      inventoryEntryId: 'short-beams',
      placementId: 'outside-beam',
      transform: { position: { x: 20, y: 20 }, rotation: 0 },
    }).execute(attempt);
    expect(placed.status).toBe('accepted');
    if (placed.status !== 'accepted') return;

    const moved = movePlacement({
      context: 'author',
      placementId: 'fixed-beam',
      position: { x: -20, y: -20 },
    }).execute(placed.state);

    expect(moved.status).toBe('accepted');
    if (moved.status !== 'accepted') return;
    expect(
      moved.state.document.objects.find(({ id }) => id === 'fixed-beam')?.transform.position,
    ).toEqual({ x: -20, y: -20 });
  });

  it('applies player move permission and zone atomically', () => {
    const attempt = createConstructionAttempt(createLevel());

    expect(
      movePlacement({
        context: 'player',
        placementId: 'fixed-beam',
        position: { x: 4, y: 4 },
      }).execute(attempt),
    ).toEqual({ status: 'rejected', reason: 'move-not-permitted' });

    const placed = placeBeam().execute(attempt);
    if (placed.status !== 'accepted') throw new Error('placement should be accepted');
    const outside = movePlacement({
      context: 'player',
      placementId: 'placed-beam',
      position: { x: 11, y: 4 },
    }).execute(placed.state);

    expect(outside).toEqual({ status: 'rejected', reason: 'outside-build-zone' });
    expect(
      placed.state.document.objects.find(({ id }) => id === 'placed-beam')?.transform.position,
    ).toEqual({ x: 4, y: 5 });
  });

  it('rotates only beams and applies player permission and zone checks', () => {
    const attempt = createConstructionAttempt(createLevel());

    expect(
      rotatePlacement({ context: 'author', placementId: 'goal-ball', rotation: 1 }).execute(
        attempt,
      ),
    ).toEqual({ status: 'rejected', reason: 'placement-not-rotatable' });
    expect(
      rotatePlacement({ context: 'player', placementId: 'fixed-beam', rotation: 1 }).execute(
        attempt,
      ),
    ).toEqual({ status: 'rejected', reason: 'rotate-not-permitted' });

    const placed = placeBeam().execute(attempt);
    if (placed.status !== 'accepted') throw new Error('placement should be accepted');
    const rotated = rotatePlacement({
      context: 'player',
      placementId: 'placed-beam',
      rotation: 1.5,
    }).execute(placed.state);

    expect(rotated.status).toBe('accepted');
    if (rotated.status !== 'accepted') return;
    expect(
      rotated.state.document.objects.find(({ id }) => id === 'placed-beam')?.transform.rotation,
    ).toBe(1.5);
  });

  it('restores the exact source entry and removes provenance atomically for the player', () => {
    const attempt = createConstructionAttempt(createLevel());
    const placed = placeBeam().execute(attempt);
    if (placed.status !== 'accepted') throw new Error('placement should be accepted');

    const removed = removePlacement({
      context: 'player',
      placementId: 'placed-beam',
    }).execute(placed.state);

    expect(removed.status).toBe('accepted');
    if (removed.status !== 'accepted') return;
    expect(removed.state.document.objects.some(({ id }) => id === 'placed-beam')).toBe(false);
    expect(removed.state.document.inventory[0]?.quantity).toBe(1);
    expect(removed.state.provenance).toEqual({});
  });

  it('rejects player removal without permission or valid matching provenance', () => {
    const attempt = createConstructionAttempt(createLevel());

    expect(
      removePlacement({ context: 'player', placementId: 'fixed-beam' }).execute(attempt),
    ).toEqual({ status: 'rejected', reason: 'remove-not-permitted' });

    const removableWithoutProvenance: ConstructionAttempt = {
      ...attempt,
      document: {
        ...attempt.document,
        objects: attempt.document.objects.map((placement) =>
          placement.id === 'fixed-beam'
            ? { ...placement, permissions: { ...placement.permissions, remove: true } }
            : placement,
        ),
      },
    };
    expect(
      removePlacement({ context: 'player', placementId: 'fixed-beam' }).execute(
        removableWithoutProvenance,
      ),
    ).toEqual({ status: 'rejected', reason: 'inventory-provenance-missing' });

    const mismatchedProvenance: ConstructionAttempt = {
      ...removableWithoutProvenance,
      provenance: { 'fixed-beam': 'short-beams' },
    };
    expect(
      removePlacement({ context: 'player', placementId: 'fixed-beam' }).execute(
        mismatchedProvenance,
      ),
    ).toEqual({ status: 'rejected', reason: 'inventory-provenance-mismatch' });
    expect(mismatchedProvenance.document.inventory[0]?.quantity).toBe(1);
  });

  it('never removes a goal object, including for the author', () => {
    const attempt = createConstructionAttempt(createLevel());

    expect(
      removePlacement({ context: 'author', placementId: 'goal-ball' }).execute(attempt),
    ).toEqual({ status: 'rejected', reason: 'goal-object-protected' });
    expect(
      removePlacement({ context: 'author', placementId: 'goal-basket' }).execute(attempt),
    ).toEqual({ status: 'rejected', reason: 'goal-object-protected' });
  });

  it('allows the author to delete a fixed non-goal object without inventory provenance', () => {
    const attempt = createConstructionAttempt(createLevel());

    const result = removePlacement({ context: 'author', placementId: 'fixed-beam' }).execute(
      attempt,
    );

    expect(result.status).toBe('accepted');
    if (result.status !== 'accepted') return;
    expect(result.state.document.objects.some(({ id }) => id === 'fixed-beam')).toBe(false);
    expect(result.state.document.inventory[0]?.quantity).toBe(1);
  });

  it('rejects a produced document that fails the LevelDocument schema', () => {
    const attempt = createConstructionAttempt(createLevel());

    const result = placeFromInventory({
      context: 'author',
      inventoryEntryId: 'short-beams',
      placementId: 'INVALID ID',
      transform: { position: { x: 2, y: 2 }, rotation: 0 },
    }).execute(attempt);

    expectRejected(result, 'invalid-level-document');
    expect(attempt.document.inventory[0]?.quantity).toBe(1);
  });

  it('supports undo and redo for atomic placement and removal', () => {
    const initialAttempt = createConstructionAttempt(createLevel());
    const history = createHistory(initialAttempt);
    const placed = executeCommand(history, placeBeam());
    if (placed.status !== 'accepted') throw new Error('placement should be accepted');

    const placementUndone = undo(placed.history);
    if (placementUndone.status !== 'accepted') throw new Error('placement undo should exist');
    expect(placementUndone.history.state).toEqual(initialAttempt);
    const placementRedone = redo(placementUndone.history);
    if (placementRedone.status !== 'accepted') throw new Error('placement redo should exist');
    expect(placementRedone.history.state.provenance).toEqual({ 'placed-beam': 'short-beams' });

    const removed = executeCommand(
      placementRedone.history,
      removePlacement({ context: 'player', placementId: 'placed-beam' }),
    );
    if (removed.status !== 'accepted') throw new Error('removal should be accepted');
    expect(removed.history.state.document.inventory[0]?.quantity).toBe(1);

    const removalUndone = undo(removed.history);
    if (removalUndone.status !== 'accepted') throw new Error('removal undo should exist');
    expect(removalUndone.history.state.provenance).toEqual({ 'placed-beam': 'short-beams' });
    const removalRedone = redo(removalUndone.history);
    if (removalRedone.status !== 'accepted') throw new Error('removal redo should exist');
    expect(removalRedone.history.state).toEqual(initialAttempt);
  });
});

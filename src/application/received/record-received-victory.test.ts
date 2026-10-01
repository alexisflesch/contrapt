import { describe, expect, it } from 'vitest';

import { createConstructionAttempt, placeFromInventory } from '../construction';
import type { ConstructionAttempt } from '../construction';
import type { LevelDocument } from '../../domain/level-document';
import { recordReceivedVictory } from './record-received-victory';
import type {
  ReceivedLevel,
  ReceivedLevelRepository,
  ReceivedLevelWriteResult,
} from './received-level-repository';

const locked = { move: false, rotate: false, remove: false } as const;

const level: LevelDocument = {
  schemaVersion: 2,
  id: 'niveau-recu',
  metadata: { title: 'Niveau reçu', author: 'Lili' },
  objects: [
    {
      id: 'ball',
      type: 'ball',
      props: {},
      transform: { position: { x: 2, y: 1 }, rotation: 0 },
      permissions: locked,
    },
    {
      id: 'basket',
      type: 'basket',
      props: {},
      transform: { position: { x: 6.5, y: 5 }, rotation: 0 },
      permissions: locked,
    },
  ],
  inventory: [
    {
      id: 'beams',
      type: 'beam',
      props: { size: 'medium' },
      quantity: 2,
      permissions: { move: true, rotate: true, remove: true },
    },
  ],
  goal: { type: 'basket', ballId: 'ball', basketId: 'basket' },
  buildZones: [{ min: { x: 0, y: 0 }, max: { x: 8, y: 6 } }],
  scene: { min: { x: 0, y: 0 }, max: { x: 8, y: 6 } },
  wires: [],
};

const id = 'recu-0123456789abcdef';

const entry = (extra: Partial<ReceivedLevel> = {}): ReceivedLevel => ({
  id,
  document: level,
  origin: 'link',
  receivedAt: '2026-09-30T08:00:00.000Z',
  solved: false,
  ...extra,
});

/** The attempt as launched: one beam per given x, all from the inventory. */
const attemptWithBeams = (...xs: readonly number[]): ConstructionAttempt =>
  xs.reduce((attempt, x, index) => {
    const placed = placeFromInventory({
      context: 'player',
      inventoryEntryId: 'beams',
      placementId: `poutre-${String(index)}`,
      transform: { position: { x, y: 3 }, rotation: 0.4 },
    }).execute(attempt);
    if (placed.status === 'rejected') throw new Error(`pose refusée : ${placed.reason}`);
    return placed.state;
  }, createConstructionAttempt(level));

const createMemoryRepository = (
  initial: readonly ReceivedLevel[],
  saveResult?: ReceivedLevelWriteResult,
) => {
  const entries = new Map(initial.map((received) => [received.id, received]));
  const saves: ReceivedLevel[] = [];
  const repository: ReceivedLevelRepository = {
    list: () => ({ status: 'ok', ids: [...entries.keys()] }),
    load: (loadedId) => ({ status: 'ok', level: entries.get(loadedId) ?? null }),
    save: (received) => {
      saves.push(received);
      if (saveResult !== undefined) return saveResult;
      entries.set(received.id, received);
      return { status: 'ok' };
    },
    delete: (deletedId) => {
      entries.delete(deletedId);
      return { status: 'ok' };
    },
  };
  return { repository, entries, saves };
};

describe('victoire sur un niveau reçu (M10, ADR 0015 § Victoire sur un niveau reçu)', () => {
  it('marque l’entrée résolue avec le nombre d’objets et la solution du lancement', () => {
    const { repository, entries } = createMemoryRepository([entry()]);

    const result = recordReceivedVictory(repository, id, attemptWithBeams(3));

    const expected = entry({
      solved: true,
      bestObjectCount: 1,
      playerSolution: {
        placements: [
          { inventoryId: 'beams', transform: { position: { x: 3, y: 3 }, rotation: 0.4 } },
        ],
      },
    });
    expect(result).toEqual({ status: 'recorded', level: expected });
    expect(entries.get(id)).toEqual(expected);
  });

  it('garde le meilleur record mais remplace la solution par la dernière victoire', () => {
    const { repository, entries } = createMemoryRepository([entry()]);

    recordReceivedVictory(repository, id, attemptWithBeams(3));
    recordReceivedVictory(repository, id, attemptWithBeams(2, 5));

    expect(entries.get(id)).toEqual(
      entry({
        solved: true,
        bestObjectCount: 1,
        playerSolution: {
          placements: [
            { inventoryId: 'beams', transform: { position: { x: 2, y: 3 }, rotation: 0.4 } },
            { inventoryId: 'beams', transform: { position: { x: 5, y: 3 }, rotation: 0.4 } },
          ],
        },
      }),
    );
  });

  it('abaisse le record quand la victoire utilise moins d’objets', () => {
    const { repository, entries } = createMemoryRepository([
      entry({ solved: true, bestObjectCount: 2, playerSolution: { placements: [] } }),
    ]);

    recordReceivedVictory(repository, id, attemptWithBeams(3));

    expect(entries.get(id)?.bestObjectCount).toBe(1);
  });

  it('ne garde que l’entrée : le niveau reçu et sa date ne changent pas', () => {
    const { repository, entries } = createMemoryRepository([entry({ origin: 'file' })]);

    recordReceivedVictory(repository, id, attemptWithBeams());

    expect(entries.get(id)).toMatchObject({
      document: level,
      origin: 'file',
      receivedAt: '2026-09-30T08:00:00.000Z',
      bestObjectCount: 0,
      playerSolution: { placements: [] },
    });
  });

  it('n’écrit rien pour une entrée absente', () => {
    const { repository, saves } = createMemoryRepository([]);

    expect(recordReceivedVictory(repository, id, attemptWithBeams(3))).toEqual({
      status: 'not-found',
    });
    expect(saves).toEqual([]);
  });

  it('rend une erreur de stockage comme un résultat, sans lever', () => {
    const { repository } = createMemoryRepository([entry()], {
      status: 'error',
      code: 'quota-exceeded',
    });
    const unreadable: ReceivedLevelRepository = {
      ...repository,
      load: () => ({ status: 'error', code: 'storage-unavailable' }),
    };

    expect(recordReceivedVictory(repository, id, attemptWithBeams(3))).toEqual({
      status: 'not-kept',
      code: 'quota-exceeded',
    });
    expect(recordReceivedVictory(unreadable, id, attemptWithBeams(3))).toEqual({
      status: 'not-kept',
      code: 'storage-unavailable',
    });
  });
});

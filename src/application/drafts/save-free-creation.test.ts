import { describe, expect, it } from 'vitest';

import type { LevelDocument } from '../../domain/level-document';
import type { DraftCreation, DraftCreationContent, DraftRepository } from './draft-repository';
import { saveFreeCreation, startFreeCreation } from './save-free-creation';

const workshop: LevelDocument = {
  schemaVersion: 2,
  id: 'free-workshop',
  metadata: { title: 'Atelier de niveau' },
  objects: [],
  inventory: [],
  goal: { type: 'basket', ballId: 'ball', basketId: 'basket' },
  buildZones: [],
  scene: { min: { x: 0, y: 0 }, max: { x: 16, y: 9 } },
  wires: [],
};

const createMemoryRepository = (initial: Readonly<Record<string, DraftCreation>> = {}) => {
  const entries = new Map(Object.entries(initial));
  const saves: DraftCreationContent[] = [];
  const repository: DraftRepository = {
    list: () => ({ status: 'ok', ids: [...entries.keys()] }),
    load: (id) => ({ status: 'ok', creation: entries.get(id) ?? null }),
    save: (creation) => {
      saves.push(creation);
      entries.set(creation.document.id, { ...creation, updatedAt: '2026-10-01T12:00:00.000Z' });
      return { status: 'ok' };
    },
    delete: () => ({ status: 'ok' }),
  };
  return { repository, entries, saves };
};

describe('atelier libre enregistré (M13, ADR 0015 § Atelier libre)', () => {
  it('enregistre le document sous `creation-<aléa>`, sans source, l’identifiant de l’atelier remplacé', () => {
    const { repository, saves } = createMemoryRepository();

    const result = startFreeCreation(repository, workshop, () => 'abc123');

    expect(result).toEqual({ status: 'ok', draftId: 'creation-abc123' });
    expect(saves).toEqual([{ document: { ...workshop, id: 'creation-abc123' } }]);
  });

  it('tire un nouvel aléa quand l’identifiant est déjà pris', () => {
    const taken: DraftCreation = {
      document: { ...workshop, id: 'creation-pris' },
      updatedAt: '2026-09-30T08:00:00.000Z',
    };
    const { repository, saves } = createMemoryRepository({ 'creation-pris': taken });
    const draws = ['pris', 'libre'];

    const result = startFreeCreation(repository, workshop, () => draws.shift() ?? 'epuise');

    expect(result).toEqual({ status: 'ok', draftId: 'creation-libre' });
    expect(saves.map(({ document }) => document.id)).toEqual(['creation-libre']);
  });

  it('rend l’erreur du dépôt sans rien enregistrer quand il ne se lit pas', () => {
    const { repository, saves } = createMemoryRepository();
    const unreadable: DraftRepository = {
      ...repository,
      load: () => ({ status: 'error', code: 'storage-unavailable' }),
    };

    expect(startFreeCreation(unreadable, workshop, () => 'abc')).toEqual({
      status: 'error',
      code: 'storage-unavailable',
    });
    expect(saves).toEqual([]);
  });

  it('rend un quota dépassé en résultat', () => {
    const { repository } = createMemoryRepository();
    const full: DraftRepository = {
      ...repository,
      save: () => ({ status: 'error', code: 'quota-exceeded' }),
    };

    expect(startFreeCreation(full, workshop, () => 'abc')).toEqual({
      status: 'error',
      code: 'quota-exceeded',
    });
  });

  it('enregistre les modifications suivantes sous le même identifiant, sans source', () => {
    const { repository, saves } = createMemoryRepository();
    const edited: LevelDocument = { ...workshop, metadata: { title: 'Mon niveau' } };

    expect(saveFreeCreation(repository, 'creation-abc123', edited)).toEqual({ status: 'ok' });

    expect(saves).toEqual([{ document: { ...edited, id: 'creation-abc123' } }]);
  });
});

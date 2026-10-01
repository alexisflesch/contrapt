import { describe, expect, it } from 'vitest';

import { MAX_TITLE_LENGTH, type LevelDocument } from '../../domain/level-document';
import type { DraftCreation, DraftCreationContent, DraftRepository } from './draft-repository';
import { duplicateCreation } from './duplicate-creation';

const locked = { move: false, rotate: false, remove: false } as const;

const workshop = (id: string, title: string): LevelDocument => ({
  schemaVersion: 2,
  id,
  metadata: { title, basedOn: [{ title: 'Le niveau d’origine', author: 'Lili' }] },
  objects: [
    {
      id: 'ball',
      type: 'ball',
      props: {},
      transform: { position: { x: 1, y: 1 }, rotation: 0 },
      permissions: locked,
    },
    {
      id: 'basket',
      type: 'basket',
      props: {},
      transform: { position: { x: 8, y: 5 }, rotation: 0 },
      permissions: locked,
    },
    {
      id: 'beam',
      type: 'beam',
      props: { size: 'short' },
      transform: { position: { x: 4, y: 3 }, rotation: 0 },
      permissions: locked,
      toPlace: true,
    },
  ],
  inventory: [],
  goal: { type: 'basket', ballId: 'ball', basketId: 'basket' },
  buildZones: [],
  scene: { min: { x: 0, y: 0 }, max: { x: 10, y: 6 } },
  wires: [],
});

const source: LevelDocument = { ...workshop('le-niveau', 'Le niveau d’origine'), objects: [] };

const createMemoryRepository = (initial: Readonly<Record<string, DraftCreation>>) => {
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
    delete: (id) => {
      entries.delete(id);
      return { status: 'ok' };
    },
  };
  return { repository, entries, saves };
};

describe('dupliquer une création (M9, ADR 0015 § Page « Mes niveaux »)', () => {
  it('enregistre une nouvelle création `creation-<aléa>` titrée « (copie) », avec la même source', () => {
    const original: DraftCreation = {
      document: workshop('campaign-01-brouillon', 'Mon remix'),
      source,
      updatedAt: '2026-09-30T08:00:00.000Z',
    };
    const { repository, entries, saves } = createMemoryRepository({
      'campaign-01-brouillon': original,
    });

    const result = duplicateCreation(repository, 'campaign-01-brouillon', () => 'abc123');

    expect(result).toEqual({ status: 'ok', draftId: 'creation-abc123' });
    expect(saves).toEqual([
      {
        document: {
          ...original.document,
          id: 'creation-abc123',
          metadata: { ...original.document.metadata, title: 'Mon remix (copie)' },
        },
        source,
      },
    ]);
    // The original stays as it was.
    expect(entries.get('campaign-01-brouillon')).toEqual(original);
  });

  it('duplique une création sans source sans lui en inventer une', () => {
    const { repository, saves } = createMemoryRepository({
      'creation-1': {
        document: workshop('creation-1', 'De zéro'),
        updatedAt: '2026-09-30T08:00:00.000Z',
      },
    });

    duplicateCreation(repository, 'creation-1', () => 'f00d');

    expect(saves).toHaveLength(1);
    expect(saves[0]).not.toHaveProperty('source');
  });

  it('tronque le titre d’origine pour garder « (copie) » entier', () => {
    const { repository, saves } = createMemoryRepository({
      'creation-1': {
        document: workshop('creation-1', 'a'.repeat(MAX_TITLE_LENGTH)),
        updatedAt: '2026-09-30T08:00:00.000Z',
      },
    });

    duplicateCreation(repository, 'creation-1', () => 'f00d');

    const title = saves[0]?.document.metadata.title ?? '';
    expect(title).toHaveLength(MAX_TITLE_LENGTH);
    expect(title).toBe(`${'a'.repeat(MAX_TITLE_LENGTH - ' (copie)'.length)} (copie)`);
  });

  it('tire un autre aléa quand l’identifiant est déjà pris', () => {
    const { repository } = createMemoryRepository({
      'creation-1': {
        document: workshop('creation-1', 'Prise'),
        updatedAt: '2026-09-30T08:00:00.000Z',
      },
    });
    const draws = ['1', '2'];

    expect(duplicateCreation(repository, 'creation-1', () => draws.shift() ?? 'x')).toEqual({
      status: 'ok',
      draftId: 'creation-2',
    });
  });

  it('rend une erreur sans rien écrire pour une création introuvable ou illisible', () => {
    const { repository, saves } = createMemoryRepository({});
    const unavailable: DraftRepository = {
      ...repository,
      load: () => ({ status: 'error', code: 'storage-unavailable' }),
    };

    expect(duplicateCreation(repository, 'absente', () => 'f00d')).toEqual({
      status: 'error',
      code: 'invalid-draft',
    });
    expect(duplicateCreation(unavailable, 'absente', () => 'f00d')).toEqual({
      status: 'error',
      code: 'storage-unavailable',
    });
    expect(saves).toEqual([]);
  });

  it('rend une erreur de quota comme un résultat', () => {
    const { repository } = createMemoryRepository({
      'creation-1': {
        document: workshop('creation-1', 'Pleine'),
        updatedAt: '2026-09-30T08:00:00.000Z',
      },
    });
    const full: DraftRepository = {
      ...repository,
      save: () => ({ status: 'error', code: 'quota-exceeded' }),
    };

    expect(duplicateCreation(full, 'creation-1', () => 'f00d')).toEqual({
      status: 'error',
      code: 'quota-exceeded',
    });
  });
});

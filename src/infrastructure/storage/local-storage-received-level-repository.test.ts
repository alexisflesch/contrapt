import { describe, expect, it } from 'vitest';

import { embeddedLevels } from '../../content/embedded-levels';
import { decodeLevelFile, encodeLevelFile } from '../level-file/level-file-codec';
import { createLocalStorageReceivedLevelRepository } from './local-storage-received-level-repository';
import type {
  ReceivedLevel,
  ReceivedLevelRepository,
} from '../../application/received/received-level-repository';

const receivedIndexKey = 'tinkerbolt:received';
const backupIndexKey = 'tinkerbolt:backup:received';
const receivedKey = (id: string): string => `tinkerbolt:received:${id}`;
const backupReceivedKey = (id: string): string => `tinkerbolt:backup:received:${id}`;

const firstId = 'recu-0123456789abcdef';
const secondId = 'recu-fedcba9876543210';

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();
  readonly writes: string[] = [];
  failGet = false;
  failSetKey: string | null = null;
  setError: unknown = new Error('stockage indisponible');

  get length(): number {
    return this.values.size;
  }

  clear(): void {
    this.values.clear();
  }

  getItem(key: string): string | null {
    if (this.failGet) throw new Error('stockage indisponible');
    return this.values.get(key) ?? null;
  }

  key(index: number): string | null {
    return [...this.values.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.writes.push(key);
    this.values.delete(key);
  }

  setItem(key: string, value: string): void {
    this.writes.push(key);
    if (key === this.failSetKey) throw this.setError;
    this.values.set(key, value);
  }

  seed(key: string, value: string): void {
    this.values.set(key, value);
  }
}

const sampleDocument = (() => {
  const document = embeddedLevels[0];
  if (document === undefined) throw new Error('Le niveau embarqué de test est indisponible.');
  return document;
})();

const completeEntry = (id: string = firstId): ReceivedLevel => ({
  id,
  document: sampleDocument,
  origin: 'link',
  receivedAt: '2026-10-01T08:30:00.000Z',
  solved: true,
  bestObjectCount: 2,
  playerSolution: {
    placements: [
      {
        inventoryId: 'inventory-short-beam',
        transform: { position: { x: 3.5, y: 2.5 }, rotation: -0.25 },
        placementId: 'player-beam-1',
      },
      {
        inventoryId: 'inventory-springboard',
        transform: { position: { x: 6, y: 4 }, rotation: 0 },
      },
    ],
    wires: [
      {
        id: 'player-wire-1',
        inventoryId: 'inventory-wire',
        sourceId: 'lever-1',
        targetId: 'player-beam-1',
      },
    ],
  },
});

const unsolvedEntry = (id: string = firstId): ReceivedLevel => ({
  id,
  document: sampleDocument,
  origin: 'file',
  receivedAt: '2026-10-01T09:00:00Z',
  solved: false,
});

const createRepository = (storage: Storage): ReceivedLevelRepository =>
  createLocalStorageReceivedLevelRepository(storage);

const indexEnvelope = (ids: readonly string[]): string =>
  JSON.stringify({ kind: 'received-index', version: 1, data: { ids } });

const storedData = (entry: ReceivedLevel): Record<string, unknown> => ({
  ...entry,
  document: JSON.parse(encodeLevelFile(entry.document)) as unknown,
});

const receivedEnvelope = (data: unknown): string =>
  JSON.stringify({ kind: 'received-level', version: 1, data });

describe('dépôt local des niveaux reçus (M3, ADR 0015)', () => {
  it('renvoie une liste vide lorsque la clé est absente', () => {
    const storage = new MemoryStorage();

    expect(createRepository(storage).list()).toEqual({ status: 'ok', ids: [] });
    expect(storage.writes).toEqual([]);
  });

  it('fait l’aller-retour d’une entrée complète, document passé par le codec de fichier', () => {
    const storage = new MemoryStorage();
    const repository = createRepository(storage);

    expect(repository.save(completeEntry())).toEqual({ status: 'ok' });

    expect(JSON.parse(storage.getItem(receivedIndexKey) ?? 'null')).toEqual({
      kind: 'received-index',
      version: 1,
      data: { ids: [firstId] },
    });
    const stored: unknown = JSON.parse(storage.getItem(receivedKey(firstId)) ?? 'null');
    expect(stored).toEqual({
      kind: 'received-level',
      version: 1,
      data: storedData(completeEntry()),
    });
    expect(decodeLevelFile(JSON.stringify(storedData(completeEntry()).document))).toEqual({
      status: 'ok',
      document: sampleDocument,
    });

    expect(repository.load(firstId)).toEqual({ status: 'ok', level: completeEntry() });
    expect(repository.list()).toEqual({ status: 'ok', ids: [firstId] });
  });

  it('fait l’aller-retour d’une entrée non résolue sans champ facultatif', () => {
    const repository = createRepository(new MemoryStorage());

    expect(repository.save(unsolvedEntry())).toEqual({ status: 'ok' });
    expect(repository.load(firstId)).toEqual({ status: 'ok', level: unsolvedEntry() });
  });

  it('remplace une entrée existante et ajoute une seule fois chaque identifiant à l’index', () => {
    const repository = createRepository(new MemoryStorage());

    repository.save(unsolvedEntry(firstId));
    repository.save(unsolvedEntry(secondId));
    repository.save(completeEntry(firstId));

    expect(repository.list()).toEqual({ status: 'ok', ids: [firstId, secondId] });
    expect(repository.load(firstId)).toEqual({ status: 'ok', level: completeEntry(firstId) });
  });

  it('sauvegarde un index illisible sous tinkerbolt:backup: et renvoie une liste vide avec avertissement', () => {
    const storage = new MemoryStorage();
    storage.seed(receivedIndexKey, '{ JSON cassé');

    expect(createRepository(storage).list()).toEqual({
      status: 'ok',
      ids: [],
      warning: 'invalid-data-backed-up',
    });
    expect(storage.getItem(backupIndexKey)).toBe('{ JSON cassé');
  });

  it.each([
    ['enveloppe inconnue', JSON.stringify({ kind: 'draft-index', version: 1, data: { ids: [] } })],
    ['version inconnue', JSON.stringify({ kind: 'received-index', version: 2, data: { ids: [] } })],
    ['identifiant dupliqué', indexEnvelope([firstId, firstId])],
    ['identifiant qui n’est pas `recu-<empreinte>`', indexEnvelope(['campaign-01'])],
  ])('sauvegarde un index avec %s avant de renvoyer une liste vide', (_name, value) => {
    const storage = new MemoryStorage();
    storage.seed(receivedIndexKey, value);

    expect(createRepository(storage).list()).toEqual({
      status: 'ok',
      ids: [],
      warning: 'invalid-data-backed-up',
    });
    expect(storage.getItem(backupIndexKey)).toBe(value);
  });

  it('retourne null pour une entrée absente', () => {
    expect(createRepository(new MemoryStorage()).load(firstId)).toEqual({
      status: 'ok',
      level: null,
    });
  });

  it.each([
    ['JSON illisible', '{ JSON cassé'],
    [
      'enveloppe inconnue',
      JSON.stringify({ kind: 'draft', version: 1, data: storedData(unsolvedEntry()) }),
    ],
    [
      'version inconnue',
      JSON.stringify({ kind: 'received-level', version: 2, data: storedData(unsolvedEntry()) }),
    ],
    [
      'document refusé par le codec de fichier',
      receivedEnvelope({ ...storedData(unsolvedEntry()), document: { schemaVersion: 2 } }),
    ],
    ['identifiant différent de la clé', receivedEnvelope(storedData(unsolvedEntry(secondId)))],
    ['origine inconnue', receivedEnvelope({ ...storedData(unsolvedEntry()), origin: 'mail' })],
    [
      'date de réception non ISO 8601',
      receivedEnvelope({ ...storedData(unsolvedEntry()), receivedAt: 'hier' }),
    ],
    [
      'solution du joueur mal formée',
      receivedEnvelope({
        ...storedData(completeEntry()),
        playerSolution: { placements: [{ inventoryId: 'inventory-short-beam' }] },
      }),
    ],
    ['record négatif', receivedEnvelope({ ...storedData(completeEntry()), bestObjectCount: -1 })],
    [
      'record sur un niveau non résolu',
      receivedEnvelope({ ...storedData(unsolvedEntry()), bestObjectCount: 2 }),
    ],
    [
      'solution du joueur sur un niveau non résolu',
      receivedEnvelope({
        ...storedData(unsolvedEntry()),
        playerSolution: completeEntry().playerSolution,
      }),
    ],
    ['champ inconnu', receivedEnvelope({ ...storedData(unsolvedEntry()), extra: true })],
  ])(
    'sauvegarde une entrée invalide (%s) avant de renvoyer null avec avertissement',
    (_name, value) => {
      const storage = new MemoryStorage();
      storage.seed(receivedKey(firstId), value);

      expect(createRepository(storage).load(firstId)).toEqual({
        status: 'ok',
        level: null,
        warning: 'invalid-data-backed-up',
      });
      expect(storage.getItem(backupReceivedKey(firstId))).toBe(value);
    },
  );

  it.each([
    ['identifiant hors forme `recu-<empreinte>`', { ...unsolvedEntry(), id: 'campaign-01' }],
    ['identifiant qui sort de l’espace de clés', { ...unsolvedEntry(), id: '../recu' }],
    ['date de réception non ISO 8601', { ...unsolvedEntry(), receivedAt: '1er octobre' }],
    ['record non entier', { ...completeEntry(), bestObjectCount: 1.5 }],
    ['record sur un niveau non résolu', { ...unsolvedEntry(), bestObjectCount: 2 }],
    ['document invalide', { ...unsolvedEntry(), document: { ...sampleDocument, id: '' } }],
  ])('refuse une entrée invalide (%s) avant toute écriture', (_name, entry) => {
    const storage = new MemoryStorage();

    expect(createRepository(storage).save(entry)).toEqual({
      status: 'error',
      code: 'invalid-received-level',
    });
    expect(storage.writes).toEqual([]);
  });

  it('sauvegarde une entrée illisible avant de la remplacer et met à jour l’index', () => {
    const storage = new MemoryStorage();
    storage.seed(receivedKey(firstId), '{ JSON cassé');
    const repository = createRepository(storage);

    expect(repository.save(unsolvedEntry())).toEqual({
      status: 'ok',
      warning: 'invalid-data-backed-up',
    });
    expect(storage.getItem(backupReceivedKey(firstId))).toBe('{ JSON cassé');
    expect(storage.writes).toEqual([
      backupReceivedKey(firstId),
      receivedKey(firstId),
      receivedIndexKey,
    ]);
    expect(repository.load(firstId)).toEqual({ status: 'ok', level: unsolvedEntry() });
  });

  it('n’écrase pas une entrée illisible si sa sauvegarde de secours échoue', () => {
    const storage = new MemoryStorage();
    storage.seed(receivedKey(firstId), '{ JSON cassé');
    storage.failSetKey = backupReceivedKey(firstId);

    expect(createRepository(storage).save(unsolvedEntry())).toEqual({
      status: 'error',
      code: 'storage-unavailable',
    });
    expect(storage.getItem(receivedKey(firstId))).toBe('{ JSON cassé');
    expect(storage.writes).toEqual([backupReceivedKey(firstId)]);
  });

  it('retire l’entrée et son identifiant de l’index', () => {
    const storage = new MemoryStorage();
    const repository = createRepository(storage);
    repository.save(unsolvedEntry(firstId));
    repository.save(unsolvedEntry(secondId));

    expect(repository.delete(firstId)).toEqual({ status: 'ok' });
    expect(storage.getItem(receivedKey(firstId))).toBeNull();
    expect(repository.list()).toEqual({ status: 'ok', ids: [secondId] });
  });

  it('sauvegarde une entrée illisible avant de la supprimer', () => {
    const storage = new MemoryStorage();
    storage.seed(receivedIndexKey, indexEnvelope([firstId]));
    storage.seed(receivedKey(firstId), '{ JSON cassé');
    const repository = createRepository(storage);

    expect(repository.delete(firstId)).toEqual({
      status: 'ok',
      warning: 'invalid-data-backed-up',
    });
    expect(storage.getItem(backupReceivedKey(firstId))).toBe('{ JSON cassé');
    expect(storage.getItem(receivedKey(firstId))).toBeNull();
    expect(repository.list()).toEqual({ status: 'ok', ids: [] });
  });

  it('restaure l’entrée si la mise à jour de l’index échoue pendant la suppression', () => {
    const storage = new MemoryStorage();
    const repository = createRepository(storage);
    repository.save(unsolvedEntry());
    const previous = storage.getItem(receivedKey(firstId));
    storage.failSetKey = receivedIndexKey;

    expect(repository.delete(firstId)).toEqual({ status: 'error', code: 'storage-unavailable' });
    expect(storage.getItem(receivedKey(firstId))).toBe(previous);
    expect(repository.list()).toEqual({ status: 'ok', ids: [firstId] });
  });

  it('renvoie un quota dépassé en résultat d’erreur sans laisser d’entrée orpheline', () => {
    const entryQuota = new MemoryStorage();
    entryQuota.failSetKey = receivedKey(firstId);
    entryQuota.setError = new DOMException('quota dépassé', 'QuotaExceededError');
    expect(createRepository(entryQuota).save(unsolvedEntry())).toEqual({
      status: 'error',
      code: 'quota-exceeded',
    });
    expect(entryQuota.getItem(receivedKey(firstId))).toBeNull();

    const indexQuota = new MemoryStorage();
    indexQuota.failSetKey = receivedIndexKey;
    indexQuota.setError = new DOMException('quota dépassé', 'QuotaExceededError');
    expect(createRepository(indexQuota).save(unsolvedEntry())).toEqual({
      status: 'error',
      code: 'quota-exceeded',
    });
    expect(indexQuota.getItem(receivedKey(firstId))).toBeNull();
  });

  it('renvoie un stockage indisponible en résultat d’erreur pour chaque opération', () => {
    const storage = new MemoryStorage();
    storage.failGet = true;
    const repository = createRepository(storage);
    const unavailable = { status: 'error', code: 'storage-unavailable' };

    expect(repository.list()).toEqual(unavailable);
    expect(repository.load(firstId)).toEqual(unavailable);
    expect(repository.save(unsolvedEntry())).toEqual(unavailable);
    expect(repository.delete(firstId)).toEqual(unavailable);
  });
});

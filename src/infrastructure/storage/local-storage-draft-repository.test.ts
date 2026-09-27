import { describe, expect, it } from 'vitest';

import { embeddedLevels } from '../../content/embedded-levels';
import { decodeLevelFile } from '../level-file/level-file-codec';
import { createLocalStorageDraftRepository } from './local-storage-draft-repository';
import type { DraftRepository } from '../../application/drafts/draft-repository';

const draftsIndexKey = 'tinkerbolt:drafts';
const backupIndexKey = 'tinkerbolt:backup:drafts';
const draftKey = (id: string): string => `tinkerbolt:draft:${id}`;
const backupDraftKey = (id: string): string => `tinkerbolt:backup:draft:${id}`;

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();
  readonly writes: string[] = [];
  failGet = false;
  failSetKey: string | null = null;
  failRemoveKey: string | null = null;
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
    if (key === this.failRemoveKey) throw new Error('suppression indisponible');
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

const createRepository = (storage: Storage): DraftRepository =>
  createLocalStorageDraftRepository(storage);

const documentWithId = (id: string) => ({ ...sampleDocument, id });

const indexEnvelope = (ids: readonly string[]): string =>
  JSON.stringify({ kind: 'draft-index', version: 1, data: { ids } });

const draftEnvelope = (levelFile: string): string =>
  JSON.stringify({ kind: 'draft', version: 1, data: { levelFile } });

describe('dépôt local de brouillons', () => {
  it('renvoie un index vide lorsque la clé est absente', () => {
    const storage = new MemoryStorage();
    const repository = createRepository(storage);

    expect(repository.list()).toEqual({ status: 'ok', ids: [] });
    expect(storage.writes).toEqual([]);
  });

  it('sauvegarde chaque document via le codec de fichier et le retrouve par son identifiant', () => {
    const storage = new MemoryStorage();
    const repository = createRepository(storage);

    expect(repository.save(documentWithId('draft-one'))).toEqual({ status: 'ok' });
    expect(JSON.parse(storage.getItem(draftsIndexKey) ?? 'null')).toEqual({
      kind: 'draft-index',
      version: 1,
      data: { ids: ['draft-one'] },
    });

    const savedValue: unknown = JSON.parse(storage.getItem(draftKey('draft-one')) ?? 'null');
    expect(savedValue).toMatchObject({
      kind: 'draft',
      version: 1,
      data: {},
    });
    if (
      typeof savedValue !== 'object' ||
      savedValue === null ||
      !('data' in savedValue) ||
      typeof savedValue.data !== 'object' ||
      savedValue.data === null ||
      !('levelFile' in savedValue.data) ||
      typeof savedValue.data.levelFile !== 'string'
    ) {
      throw new Error('Le document n’est pas conservé dans le codec de fichier.');
    }
    expect(decodeLevelFile(savedValue.data.levelFile)).toMatchObject({
      status: 'ok',
      document: documentWithId('draft-one'),
    });
    expect(repository.load('draft-one')).toEqual({
      status: 'ok',
      document: documentWithId('draft-one'),
    });
  });

  it('ajoute une seule fois chaque identifiant à l’index et conserve leur ordre', () => {
    const storage = new MemoryStorage();
    const repository = createRepository(storage);

    repository.save(documentWithId('draft-one'));
    repository.save(documentWithId('draft-two'));
    repository.save(documentWithId('draft-one'));

    expect(repository.list()).toEqual({ status: 'ok', ids: ['draft-one', 'draft-two'] });
  });

  it('sauvegarde un index illisible avant de renvoyer un index vide avec avertissement', () => {
    const storage = new MemoryStorage();
    storage.seed(draftsIndexKey, '{ JSON cassé');
    const repository = createRepository(storage);

    expect(repository.list()).toEqual({
      status: 'ok',
      ids: [],
      warning: 'invalid-data-backed-up',
    });
    expect(storage.getItem(backupIndexKey)).toBe('{ JSON cassé');
  });

  it.each([
    ['enveloppe inconnue', JSON.stringify({ kind: 'other', version: 1, data: { ids: [] } })],
    ['version inconnue', JSON.stringify({ kind: 'draft-index', version: 2, data: { ids: [] } })],
    ['identifiant dupliqué', indexEnvelope(['draft-one', 'draft-one'])],
  ])('sauvegarde un index avec %s avant de renvoyer une liste vide', (_name, value) => {
    const storage = new MemoryStorage();
    storage.seed(draftsIndexKey, value);
    const repository = createRepository(storage);

    expect(repository.list()).toEqual({
      status: 'ok',
      ids: [],
      warning: 'invalid-data-backed-up',
    });
    expect(storage.getItem(backupIndexKey)).toBe(value);
  });

  it('retourne null pour un brouillon absent', () => {
    const repository = createRepository(new MemoryStorage());

    expect(repository.load('missing-draft')).toEqual({ status: 'ok', document: null });
  });

  it('sauvegarde un brouillon invalide avant de renvoyer null avec avertissement', () => {
    const storage = new MemoryStorage();
    storage.seed(draftKey('draft-one'), '{ JSON cassé');
    const repository = createRepository(storage);

    expect(repository.load('draft-one')).toEqual({
      status: 'ok',
      document: null,
      warning: 'invalid-data-backed-up',
    });
    expect(storage.getItem(backupDraftKey('draft-one'))).toBe('{ JSON cassé');
  });

  it('sauvegarde l’enveloppe si le document du brouillon est invalide', () => {
    const storage = new MemoryStorage();
    const invalidValue = draftEnvelope('{ mauvais fichier');
    storage.seed(draftKey('draft-one'), invalidValue);
    const repository = createRepository(storage);

    expect(repository.load('draft-one')).toEqual({
      status: 'ok',
      document: null,
      warning: 'invalid-data-backed-up',
    });
    expect(storage.getItem(backupDraftKey('draft-one'))).toBe(invalidValue);
  });

  it('refuse un identifiant ou un document invalide avant toute écriture', () => {
    const storage = new MemoryStorage();
    const repository = createRepository(storage);

    expect(repository.save(documentWithId('../draft'))).toEqual({
      status: 'error',
      code: 'invalid-draft',
    });
    expect(repository.save({ ...sampleDocument, id: '' })).toEqual({
      status: 'error',
      code: 'invalid-draft',
    });
    expect(storage.writes).toEqual([]);
  });

  it('sauvegarde un brouillon invalide avant de le remplacer et met à jour l’index', () => {
    const storage = new MemoryStorage();
    storage.seed(draftKey('draft-one'), '{ JSON cassé');
    const repository = createRepository(storage);

    expect(repository.save(documentWithId('draft-one'))).toEqual({
      status: 'ok',
      warning: 'invalid-data-backed-up',
    });
    expect(storage.getItem(backupDraftKey('draft-one'))).toBe('{ JSON cassé');
    expect(storage.writes).toEqual([
      backupDraftKey('draft-one'),
      draftKey('draft-one'),
      draftsIndexKey,
    ]);
    expect(repository.load('draft-one')).toMatchObject({
      status: 'ok',
      document: { id: 'draft-one' },
    });
  });

  it('n’écrase pas un brouillon invalide si sa sauvegarde de secours échoue', () => {
    const storage = new MemoryStorage();
    storage.seed(draftKey('draft-one'), '{ JSON cassé');
    storage.failSetKey = backupDraftKey('draft-one');
    const repository = createRepository(storage);

    expect(repository.save(documentWithId('draft-one'))).toEqual({
      status: 'error',
      code: 'storage-unavailable',
    });
    expect(storage.getItem(draftKey('draft-one'))).toBe('{ JSON cassé');
    expect(storage.writes).toEqual([backupDraftKey('draft-one')]);
  });

  it('retire le brouillon et son identifiant de l’index', () => {
    const storage = new MemoryStorage();
    const repository = createRepository(storage);
    repository.save(documentWithId('draft-one'));
    repository.save(documentWithId('draft-two'));

    expect(repository.delete('draft-one')).toEqual({ status: 'ok' });
    expect(storage.getItem(draftKey('draft-one'))).toBeNull();
    expect(repository.list()).toEqual({ status: 'ok', ids: ['draft-two'] });
  });

  it('sauvegarde un brouillon invalide avant de le supprimer', () => {
    const storage = new MemoryStorage();
    storage.seed(draftsIndexKey, indexEnvelope(['draft-one']));
    storage.seed(draftKey('draft-one'), '{ JSON cassé');
    const repository = createRepository(storage);

    expect(repository.delete('draft-one')).toEqual({
      status: 'ok',
      warning: 'invalid-data-backed-up',
    });
    expect(storage.getItem(backupDraftKey('draft-one'))).toBe('{ JSON cassé');
    expect(storage.getItem(draftKey('draft-one'))).toBeNull();
    expect(repository.list()).toEqual({ status: 'ok', ids: [] });
  });

  it('restaure le brouillon si la mise à jour de l’index échoue pendant la suppression', () => {
    const storage = new MemoryStorage();
    const repository = createRepository(storage);
    repository.save(documentWithId('draft-one'));
    const previousDraft = storage.getItem(draftKey('draft-one'));
    storage.failSetKey = draftsIndexKey;

    expect(repository.delete('draft-one')).toEqual({
      status: 'error',
      code: 'storage-unavailable',
    });
    expect(storage.getItem(draftKey('draft-one'))).toBe(previousDraft);
    expect(repository.list()).toEqual({ status: 'ok', ids: ['draft-one'] });
  });

  it('convertit un stockage indisponible et un quota dépassé en erreurs typées', () => {
    const unavailable = new MemoryStorage();
    unavailable.failGet = true;
    expect(createRepository(unavailable).list()).toEqual({
      status: 'error',
      code: 'storage-unavailable',
    });

    const quota = new MemoryStorage();
    quota.failSetKey = draftKey('draft-one');
    quota.setError = new DOMException('quota dépassé', 'QuotaExceededError');
    expect(createRepository(quota).save(documentWithId('draft-one'))).toEqual({
      status: 'error',
      code: 'quota-exceeded',
    });
  });
});

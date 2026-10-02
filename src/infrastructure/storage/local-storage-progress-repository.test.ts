import { describe, expect, it } from 'vitest';

import { createLocalStorageProgressRepository } from './local-storage-progress-repository';

const progressKey = 'tinkerbolt:progress';
const backupKey = 'tinkerbolt:backup:progress';

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();
  readonly writes: string[] = [];
  failGet = false;
  failRemove = false;
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
    this.writes.push(`-${key}`);
    if (this.failRemove) throw new Error('stockage indisponible');
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

const savedProgress = {
  'level-1': { resolved: true, bestObjectCount: 3 },
  'level-2': { resolved: false, bestObjectCount: null },
} as const;

describe('dépôt local de progression', () => {
  it('renvoie une progression vide si aucune valeur n’existe', () => {
    const storage = new MemoryStorage();
    const repository = createLocalStorageProgressRepository(storage);

    expect(repository.load()).toEqual({ status: 'ok', progress: {} });
    expect(storage.writes).toEqual([]);
  });

  it('fait un aller-retour de progression dans une enveloppe versionnée', () => {
    const storage = new MemoryStorage();
    const repository = createLocalStorageProgressRepository(storage);

    expect(repository.save(savedProgress)).toEqual({ status: 'ok' });
    expect(JSON.parse(storage.getItem(progressKey) ?? 'null')).toEqual({
      kind: 'progress',
      version: 1,
      data: savedProgress,
    });
    expect(repository.load()).toEqual({ status: 'ok', progress: savedProgress });
  });

  it('sauvegarde un JSON invalide puis renvoie une progression vide avec avertissement', () => {
    const storage = new MemoryStorage();
    storage.seed(progressKey, '{ JSON cassé');
    const repository = createLocalStorageProgressRepository(storage);

    expect(repository.load()).toEqual({
      status: 'ok',
      progress: {},
      warning: 'invalid-data-backed-up',
    });
    expect(storage.getItem(backupKey)).toBe('{ JSON cassé');
  });

  it.each([
    ['enveloppe inconnue', JSON.stringify({ kind: 'other', version: 1, data: {} })],
    ['version inconnue', JSON.stringify({ kind: 'progress', version: 2, data: {} })],
    [
      'donnée invalide',
      JSON.stringify({ kind: 'progress', version: 1, data: { 'level-1': { resolved: true } } }),
    ],
  ])('sauvegarde une %s invalide avant de la remplacer', (_description, rawValue) => {
    const storage = new MemoryStorage();
    storage.seed(progressKey, rawValue);
    const repository = createLocalStorageProgressRepository(storage);

    expect(repository.save(savedProgress)).toEqual({ status: 'ok' });
    expect(storage.getItem(backupKey)).toBe(rawValue);
    expect(storage.writes).toEqual([backupKey, progressKey]);
    expect(repository.load()).toEqual({ status: 'ok', progress: savedProgress });
  });

  it('ne remplace pas une valeur invalide si la sauvegarde de secours échoue', () => {
    const storage = new MemoryStorage();
    storage.seed(progressKey, '{ JSON cassé');
    storage.failSetKey = backupKey;
    const repository = createLocalStorageProgressRepository(storage);

    expect(repository.save(savedProgress)).toEqual({
      status: 'error',
      code: 'storage-unavailable',
    });
    expect(storage.getItem(progressKey)).toBe('{ JSON cassé');
    expect(storage.writes).toEqual([backupKey]);
  });

  it('convertit une erreur de lecture du stockage en résultat', () => {
    const storage = new MemoryStorage();
    storage.failGet = true;
    const repository = createLocalStorageProgressRepository(storage);

    expect(repository.load()).toEqual({
      status: 'error',
      code: 'storage-unavailable',
    });
  });

  it('convertit un quota dépassé en résultat sans exception', () => {
    const storage = new MemoryStorage();
    storage.failSetKey = progressKey;
    storage.setError = new DOMException('quota dépassé', 'QuotaExceededError');
    const repository = createLocalStorageProgressRepository(storage);

    expect(() => repository.save(savedProgress)).not.toThrow();
    expect(repository.save(savedProgress)).toEqual({ status: 'error', code: 'quota-exceeded' });
  });

  it('refuse des données de progression invalides avant toute écriture', () => {
    const storage = new MemoryStorage();
    const repository = createLocalStorageProgressRepository(storage);

    expect(repository.save({ 'level-1': { resolved: true, bestObjectCount: -1 } })).toEqual({
      status: 'error',
      code: 'invalid-progress',
    });
    expect(storage.writes).toEqual([]);
  });

  describe('remise à zéro de la progression (U11)', () => {
    it('efface la progression enregistrée et rien d’autre', () => {
      const storage = new MemoryStorage();
      const repository = createLocalStorageProgressRepository(storage);
      repository.save(savedProgress);
      storage.seed('tinkerbolt:preferences', '{"kind":"preferences","version":1,"data":{}}');
      storage.seed('tinkerbolt:draft:campaign-01-brouillon', 'création');
      storage.seed('tinkerbolt:received', '[]');
      storage.seed(backupKey, 'ancienne sauvegarde');

      expect(repository.clear()).toEqual({ status: 'ok' });

      expect(storage.getItem(progressKey)).toBeNull();
      expect(repository.load()).toEqual({ status: 'ok', progress: {} });
      expect(storage.getItem('tinkerbolt:preferences')).not.toBeNull();
      expect(storage.getItem('tinkerbolt:draft:campaign-01-brouillon')).toBe('création');
      expect(storage.getItem('tinkerbolt:received')).toBe('[]');
      expect(storage.getItem(backupKey)).toBe('ancienne sauvegarde');
    });

    it('réussit sans rien écrire quand aucune progression n’existe', () => {
      const storage = new MemoryStorage();
      const repository = createLocalStorageProgressRepository(storage);

      expect(repository.clear()).toEqual({ status: 'ok' });
      expect(storage.writes.filter((key) => !key.startsWith('-'))).toEqual([]);
    });

    it('sauvegarde une valeur illisible avant de l’effacer', () => {
      const storage = new MemoryStorage();
      storage.seed(progressKey, '{ JSON cassé');
      const repository = createLocalStorageProgressRepository(storage);

      expect(repository.clear()).toEqual({ status: 'ok' });
      expect(storage.getItem(backupKey)).toBe('{ JSON cassé');
      expect(storage.getItem(progressKey)).toBeNull();
    });

    it('n’efface pas une valeur illisible si la sauvegarde de secours échoue', () => {
      const storage = new MemoryStorage();
      storage.seed(progressKey, '{ JSON cassé');
      storage.failSetKey = backupKey;
      storage.setError = new DOMException('quota dépassé', 'QuotaExceededError');
      const repository = createLocalStorageProgressRepository(storage);

      expect(repository.clear()).toEqual({ status: 'error', code: 'quota-exceeded' });
      expect(storage.getItem(progressKey)).toBe('{ JSON cassé');
    });

    it('convertit un stockage indisponible en résultat, sans exception', () => {
      const storage = new MemoryStorage();
      const repository = createLocalStorageProgressRepository(storage);
      repository.save(savedProgress);
      storage.failRemove = true;

      expect(() => repository.clear()).not.toThrow();
      expect(repository.clear()).toEqual({ status: 'error', code: 'storage-unavailable' });
      storage.failGet = true;
      expect(repository.clear()).toEqual({ status: 'error', code: 'storage-unavailable' });
    });
  });
});

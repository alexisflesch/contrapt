import { describe, expect, it } from 'vitest';

import { createLocalStoragePreferencesRepository } from './local-storage-preferences-repository';

const preferencesKey = 'tinkerbolt:preferences';
const backupKey = 'tinkerbolt:backup:preferences';

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

describe('dépôt local des préférences (ADR 0011, ADR 0016 § Pseudo)', () => {
  it('renvoie des préférences vides si aucune valeur n’existe, sans rien écrire', () => {
    const storage = new MemoryStorage();
    const repository = createLocalStoragePreferencesRepository(storage);

    expect(repository.load()).toEqual({ status: 'ok', preferences: {} });
    expect(storage.writes).toEqual([]);
  });

  it('retient le dernier pseudo dans une enveloppe versionnée', () => {
    const storage = new MemoryStorage();
    const repository = createLocalStoragePreferencesRepository(storage);

    expect(repository.save({ author: 'Lili' })).toEqual({ status: 'ok' });
    expect(JSON.parse(storage.getItem(preferencesKey) ?? 'null')).toEqual({
      kind: 'preferences',
      version: 1,
      data: { author: 'Lili' },
    });
    expect(repository.load()).toEqual({ status: 'ok', preferences: { author: 'Lili' } });
  });

  it('oublie le pseudo quand on enregistre des préférences sans pseudo', () => {
    const storage = new MemoryStorage();
    const repository = createLocalStoragePreferencesRepository(storage);
    repository.save({ author: 'Lili' });

    expect(repository.save({})).toEqual({ status: 'ok' });
    expect(repository.load()).toEqual({ status: 'ok', preferences: {} });
  });

  it('retient que l’aide du niveau 1 est terminée, à côté du pseudo (U8)', () => {
    const storage = new MemoryStorage();
    const repository = createLocalStoragePreferencesRepository(storage);

    expect(repository.save({ author: 'Lili', firstLevelHintDone: true })).toEqual({
      status: 'ok',
    });
    expect(JSON.parse(storage.getItem(preferencesKey) ?? 'null')).toEqual({
      kind: 'preferences',
      version: 1,
      data: { author: 'Lili', firstLevelHintDone: true },
    });
    expect(repository.load()).toEqual({
      status: 'ok',
      preferences: { author: 'Lili', firstLevelHintDone: true },
    });
  });

  it('retient le refus de l’invitation d’installation, à côté des autres préférences (U10)', () => {
    const storage = new MemoryStorage();
    const repository = createLocalStoragePreferencesRepository(storage);

    expect(
      repository.save({
        author: 'Lili',
        firstLevelHintDone: true,
        installInvitationDeclined: true,
      }),
    ).toEqual({ status: 'ok' });
    expect(JSON.parse(storage.getItem(preferencesKey) ?? 'null')).toEqual({
      kind: 'preferences',
      version: 1,
      data: { author: 'Lili', firstLevelHintDone: true, installInvitationDeclined: true },
    });
    expect(repository.load()).toEqual({
      status: 'ok',
      preferences: { author: 'Lili', firstLevelHintDone: true, installInvitationDeclined: true },
    });
  });

  it('relit à l’identique des préférences écrites avant U10, sans refus d’installation', () => {
    const storage = new MemoryStorage();
    const before = JSON.stringify({
      kind: 'preferences',
      version: 1,
      data: { author: 'Lili', firstLevelHintDone: true },
    });
    storage.seed(preferencesKey, before);
    const repository = createLocalStoragePreferencesRepository(storage);

    expect(repository.load()).toEqual({
      status: 'ok',
      preferences: { author: 'Lili', firstLevelHintDone: true },
    });
    expect(storage.writes).toEqual([]);
    expect(storage.getItem(preferencesKey)).toBe(before);
  });

  it('relit à l’identique des préférences écrites avant U8, sans l’aide du niveau 1', () => {
    const storage = new MemoryStorage();
    const before = JSON.stringify({ kind: 'preferences', version: 1, data: { author: 'Lili' } });
    storage.seed(preferencesKey, before);
    const repository = createLocalStoragePreferencesRepository(storage);

    expect(repository.load()).toEqual({ status: 'ok', preferences: { author: 'Lili' } });
    expect(storage.writes).toEqual([]);
    expect(storage.getItem(preferencesKey)).toBe(before);
  });

  it('sauvegarde un JSON invalide puis renvoie des préférences vides avec avertissement', () => {
    const storage = new MemoryStorage();
    storage.seed(preferencesKey, '{ JSON cassé');
    const repository = createLocalStoragePreferencesRepository(storage);

    expect(repository.load()).toEqual({
      status: 'ok',
      preferences: {},
      warning: 'invalid-data-backed-up',
    });
    expect(storage.getItem(backupKey)).toBe('{ JSON cassé');
  });

  it.each([
    ['enveloppe inconnue', JSON.stringify({ kind: 'progress', version: 1, data: {} })],
    ['version inconnue', JSON.stringify({ kind: 'preferences', version: 2, data: {} })],
    [
      'pseudo invalide',
      JSON.stringify({ kind: 'preferences', version: 1, data: { author: 'Li\nli' } }),
    ],
    [
      'aide du niveau 1 invalide',
      JSON.stringify({ kind: 'preferences', version: 1, data: { firstLevelHintDone: false } }),
    ],
    [
      'refus d’installation invalide',
      JSON.stringify({ kind: 'preferences', version: 1, data: { installInvitationDeclined: 1 } }),
    ],
    [
      'champ inconnu',
      JSON.stringify({ kind: 'preferences', version: 1, data: { email: 'a@b.c' } }),
    ],
  ])('sauvegarde une valeur invalide (%s) avant de la remplacer', (_description, rawValue) => {
    const storage = new MemoryStorage();
    storage.seed(preferencesKey, rawValue);
    const repository = createLocalStoragePreferencesRepository(storage);

    expect(repository.load()).toEqual({
      status: 'ok',
      preferences: {},
      warning: 'invalid-data-backed-up',
    });
    expect(repository.save({ author: 'Lili' })).toEqual({ status: 'ok' });
    expect(storage.getItem(backupKey)).toBe(rawValue);
    expect(repository.load()).toEqual({ status: 'ok', preferences: { author: 'Lili' } });
  });

  it('ne remplace pas une valeur invalide si la sauvegarde de secours échoue', () => {
    const storage = new MemoryStorage();
    storage.seed(preferencesKey, '{ JSON cassé');
    storage.failSetKey = backupKey;
    const repository = createLocalStoragePreferencesRepository(storage);

    expect(repository.save({ author: 'Lili' })).toEqual({
      status: 'error',
      code: 'storage-unavailable',
    });
    expect(storage.getItem(preferencesKey)).toBe('{ JSON cassé');
  });

  it('convertit une erreur de lecture du stockage en résultat', () => {
    const storage = new MemoryStorage();
    storage.failGet = true;
    const repository = createLocalStoragePreferencesRepository(storage);

    expect(repository.load()).toEqual({ status: 'error', code: 'storage-unavailable' });
    expect(repository.save({ author: 'Lili' })).toEqual({
      status: 'error',
      code: 'storage-unavailable',
    });
  });

  it('convertit un quota dépassé en résultat sans exception', () => {
    const storage = new MemoryStorage();
    storage.failSetKey = preferencesKey;
    storage.setError = new DOMException('quota dépassé', 'QuotaExceededError');
    const repository = createLocalStoragePreferencesRepository(storage);

    expect(repository.save({ author: 'Lili' })).toEqual({
      status: 'error',
      code: 'quota-exceeded',
    });
  });

  it('refuse un pseudo invalide avant toute écriture', () => {
    const storage = new MemoryStorage();
    const repository = createLocalStoragePreferencesRepository(storage);

    expect(repository.save({ author: '   ' })).toEqual({
      status: 'error',
      code: 'invalid-preferences',
    });
    expect(repository.save({ author: 'x'.repeat(41) })).toEqual({
      status: 'error',
      code: 'invalid-preferences',
    });
    expect(storage.writes).toEqual([]);
  });
});

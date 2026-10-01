import { describe, expect, it } from 'vitest';

import { embeddedLevels } from '../../content/embedded-levels';
import { encodeLevelFile } from '../level-file/level-file-codec';
import { createLocalStorageDraftRepository } from './local-storage-draft-repository';
import type { DraftRepository } from '../../application/drafts/draft-repository';
import type { LevelDocument } from '../../domain/level-document';

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

const fixedInstant = '2026-10-01T12:00:00.000Z';
const fixedClock = (): Date => new Date(fixedInstant);

const createRepository = (storage: Storage, now: () => Date = fixedClock): DraftRepository =>
  createLocalStorageDraftRepository(storage, now);

const documentWithId = (id: string) => ({ ...sampleDocument, id });

const creationOf = (document: LevelDocument) => ({ document });

/** A level stored in a v2 envelope: the JSON value of the level file codec text. */
const asStoredJson = (document: LevelDocument): unknown => JSON.parse(encodeLevelFile(document));

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

  it('sauvegarde chaque création dans une enveloppe v2 via le codec de fichier et la retrouve par son identifiant', () => {
    const storage = new MemoryStorage();
    const repository = createRepository(storage);

    expect(repository.save(creationOf(documentWithId('draft-one')))).toEqual({ status: 'ok' });
    expect(JSON.parse(storage.getItem(draftsIndexKey) ?? 'null')).toEqual({
      kind: 'draft-index',
      version: 1,
      data: { ids: ['draft-one'] },
    });

    expect(JSON.parse(storage.getItem(draftKey('draft-one')) ?? 'null')).toEqual({
      kind: 'draft',
      version: 2,
      data: {
        document: asStoredJson(documentWithId('draft-one')),
        updatedAt: fixedInstant,
      },
    });
    expect(repository.load('draft-one')).toEqual({
      status: 'ok',
      creation: { document: documentWithId('draft-one'), updatedAt: fixedInstant },
    });
  });

  it('ajoute une seule fois chaque identifiant à l’index et conserve leur ordre', () => {
    const storage = new MemoryStorage();
    const repository = createRepository(storage);

    repository.save(creationOf(documentWithId('draft-one')));
    repository.save(creationOf(documentWithId('draft-two')));
    repository.save(creationOf(documentWithId('draft-one')));

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

    expect(repository.load('missing-draft')).toEqual({ status: 'ok', creation: null });
  });

  it('sauvegarde un brouillon invalide avant de renvoyer null avec avertissement', () => {
    const storage = new MemoryStorage();
    storage.seed(draftKey('draft-one'), '{ JSON cassé');
    const repository = createRepository(storage);

    expect(repository.load('draft-one')).toEqual({
      status: 'ok',
      creation: null,
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
      creation: null,
      warning: 'invalid-data-backed-up',
    });
    expect(storage.getItem(backupDraftKey('draft-one'))).toBe(invalidValue);
  });

  it('refuse un identifiant ou un document invalide avant toute écriture', () => {
    const storage = new MemoryStorage();
    const repository = createRepository(storage);

    expect(repository.save(creationOf(documentWithId('../draft')))).toEqual({
      status: 'error',
      code: 'invalid-draft',
    });
    expect(repository.save(creationOf({ ...sampleDocument, id: '' }))).toEqual({
      status: 'error',
      code: 'invalid-draft',
    });
    expect(storage.writes).toEqual([]);
  });

  it('sauvegarde un brouillon invalide avant de le remplacer et met à jour l’index', () => {
    const storage = new MemoryStorage();
    storage.seed(draftKey('draft-one'), '{ JSON cassé');
    const repository = createRepository(storage);

    expect(repository.save(creationOf(documentWithId('draft-one')))).toEqual({
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
      creation: { document: { id: 'draft-one' } },
    });
  });

  it('n’écrase pas un brouillon invalide si sa sauvegarde de secours échoue', () => {
    const storage = new MemoryStorage();
    storage.seed(draftKey('draft-one'), '{ JSON cassé');
    storage.failSetKey = backupDraftKey('draft-one');
    const repository = createRepository(storage);

    expect(repository.save(creationOf(documentWithId('draft-one')))).toEqual({
      status: 'error',
      code: 'storage-unavailable',
    });
    expect(storage.getItem(draftKey('draft-one'))).toBe('{ JSON cassé');
    expect(storage.writes).toEqual([backupDraftKey('draft-one')]);
  });

  it('retire le brouillon et son identifiant de l’index', () => {
    const storage = new MemoryStorage();
    const repository = createRepository(storage);
    repository.save(creationOf(documentWithId('draft-one')));
    repository.save(creationOf(documentWithId('draft-two')));

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
    repository.save(creationOf(documentWithId('draft-one')));
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
    expect(createRepository(quota).save(creationOf(documentWithId('draft-one')))).toEqual({
      status: 'error',
      code: 'quota-exceeded',
    });
  });
});

describe('enveloppe des créations v2 (M4, ADR 0015)', () => {
  const sourceDocument = (() => {
    const document = embeddedLevels[1];
    if (document === undefined) throw new Error('Le niveau source de test est indisponible.');
    return document;
  })();
  const migrationInstant = '2026-09-15T08:30:00.000Z';
  const migrationClock = (): Date => new Date(migrationInstant);
  const invalidClock = (): Date => new Date(Number.NaN);

  const creationEnvelope = (data: Record<string, unknown>): string =>
    JSON.stringify({ kind: 'draft', version: 2, data });

  const validV2Data = (): Record<string, unknown> => ({
    document: asStoredJson(documentWithId('draft-one')),
    source: asStoredJson(sourceDocument),
    updatedAt: '2026-09-30T18:45:12.000+02:00',
  });

  it('lit une enveloppe v1 existante comme une création sans source datée par l’horloge injectée', () => {
    const storage = new MemoryStorage();
    storage.seed(
      draftKey('draft-one'),
      draftEnvelope(encodeLevelFile(documentWithId('draft-one'))),
    );
    const repository = createRepository(storage, migrationClock);

    expect(repository.load('draft-one')).toEqual({
      status: 'ok',
      creation: { document: documentWithId('draft-one'), updatedAt: migrationInstant },
    });
    expect(storage.writes).toEqual([]);
  });

  it('relit une enveloppe v2 à l’identique, source et date comprises', () => {
    const storage = new MemoryStorage();
    storage.seed(draftKey('draft-one'), creationEnvelope(validV2Data()));
    const repository = createRepository(storage, migrationClock);

    expect(repository.load('draft-one')).toEqual({
      status: 'ok',
      creation: {
        document: documentWithId('draft-one'),
        source: sourceDocument,
        updatedAt: '2026-09-30T18:45:12.000+02:00',
      },
    });
    expect(storage.writes).toEqual([]);
  });

  it('enregistre la source comme valeur du codec de fichier et la relit à l’identique', () => {
    const storage = new MemoryStorage();
    const repository = createRepository(storage);

    expect(
      repository.save({ document: documentWithId('draft-one'), source: sourceDocument }),
    ).toEqual({ status: 'ok' });
    expect(JSON.parse(storage.getItem(draftKey('draft-one')) ?? 'null')).toEqual({
      kind: 'draft',
      version: 2,
      data: {
        document: asStoredJson(documentWithId('draft-one')),
        source: asStoredJson(sourceDocument),
        updatedAt: fixedInstant,
      },
    });
    expect(repository.load('draft-one')).toEqual({
      status: 'ok',
      creation: {
        document: documentWithId('draft-one'),
        source: sourceDocument,
        updatedAt: fixedInstant,
      },
    });
  });

  it('réécrit toujours une enveloppe v1 en v2, sans la sauvegarder comme illisible', () => {
    const storage = new MemoryStorage();
    storage.seed(draftsIndexKey, indexEnvelope(['draft-one']));
    storage.seed(
      draftKey('draft-one'),
      draftEnvelope(encodeLevelFile(documentWithId('draft-one'))),
    );
    const repository = createRepository(storage);

    expect(repository.save(creationOf(documentWithId('draft-one')))).toEqual({ status: 'ok' });
    expect(storage.getItem(backupDraftKey('draft-one'))).toBeNull();
    expect(JSON.parse(storage.getItem(draftKey('draft-one')) ?? 'null')).toMatchObject({
      kind: 'draft',
      version: 2,
      data: { updatedAt: fixedInstant },
    });
  });

  it.each([
    ['une source refusée par le codec', { ...validV2Data(), source: { version: 2, id: 'x' } }],
    ['une source qui n’est pas un objet', { ...validV2Data(), source: 'niveau' }],
    ['un document refusé par le codec', { ...validV2Data(), document: { version: 99 } }],
    [
      'un document d’un autre identifiant',
      { ...validV2Data(), document: asStoredJson(documentWithId('draft-two')) },
    ],
    ['une date absente', { document: validV2Data().document }],
    ['une date invalide', { ...validV2Data(), updatedAt: 'hier' }],
    ['un champ inconnu', { ...validV2Data(), levelFile: '' }],
  ])('sauvegarde une enveloppe v2 avec %s puis avertit', (_name, data) => {
    const storage = new MemoryStorage();
    const invalidValue = creationEnvelope(data);
    storage.seed(draftKey('draft-one'), invalidValue);
    const repository = createRepository(storage);

    expect(repository.load('draft-one')).toEqual({
      status: 'ok',
      creation: null,
      warning: 'invalid-data-backed-up',
    });
    expect(storage.getItem(backupDraftKey('draft-one'))).toBe(invalidValue);
  });

  it('sauvegarde une enveloppe d’une version inconnue puis avertit', () => {
    const storage = new MemoryStorage();
    const invalidValue = JSON.stringify({ kind: 'draft', version: 3, data: validV2Data() });
    storage.seed(draftKey('draft-one'), invalidValue);

    expect(createRepository(storage).load('draft-one')).toEqual({
      status: 'ok',
      creation: null,
      warning: 'invalid-data-backed-up',
    });
    expect(storage.getItem(backupDraftKey('draft-one'))).toBe(invalidValue);
  });

  it('sauvegarde une création à la source invalide avant de la remplacer', () => {
    const storage = new MemoryStorage();
    const invalidValue = creationEnvelope({ ...validV2Data(), source: 'niveau' });
    storage.seed(draftKey('draft-one'), invalidValue);
    const repository = createRepository(storage);

    expect(repository.save(creationOf(documentWithId('draft-one')))).toEqual({
      status: 'ok',
      warning: 'invalid-data-backed-up',
    });
    expect(storage.getItem(backupDraftKey('draft-one'))).toBe(invalidValue);
  });

  it('refuse une source invalide avant toute écriture', () => {
    const storage = new MemoryStorage();
    const repository = createRepository(storage);
    const invalidSource: LevelDocument = { ...sourceDocument, id: '' };

    expect(
      repository.save({ document: documentWithId('draft-one'), source: invalidSource }),
    ).toEqual({ status: 'error', code: 'invalid-draft' });
    expect(storage.writes).toEqual([]);
  });

  it('refuse d’écrire quand l’horloge injectée ne donne pas un instant valide', () => {
    const storage = new MemoryStorage();
    const repository = createRepository(storage, invalidClock);

    expect(repository.save(creationOf(documentWithId('draft-one')))).toEqual({
      status: 'error',
      code: 'invalid-draft',
    });
    expect(storage.writes).toEqual([]);
  });

  it('ne sauvegarde pas une enveloppe v1 valide quand l’horloge ne peut pas la dater', () => {
    const storage = new MemoryStorage();
    const value = draftEnvelope(encodeLevelFile(documentWithId('draft-one')));
    storage.seed(draftKey('draft-one'), value);

    expect(createRepository(storage, invalidClock).load('draft-one')).toEqual({
      status: 'error',
      code: 'invalid-draft',
    });
    expect(storage.writes).toEqual([]);
  });
});

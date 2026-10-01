import { describe, expect, it } from 'vitest';

import { embeddedLevels } from '../../content/embedded-levels';
import type { LevelDocument } from '../../domain/level-document';
import type { DraftRepository } from './draft-repository';
import { importLevelAsDraft } from './import-level-draft';

const source = embeddedLevels[0];
if (source === undefined) throw new Error('Niveau embarqué introuvable.');

const createMemoryRepository = (documents: readonly LevelDocument[] = []) => {
  const saved = new Map(documents.map((document) => [document.id, document]));
  const repository: DraftRepository = {
    list: () => ({ status: 'ok', ids: [...saved.keys()] }),
    load: (id) => ({ status: 'ok', document: saved.get(id) ?? null }),
    save: (document) => {
      saved.set(document.id, document);
      return { status: 'ok' };
    },
    delete: (id) => {
      saved.delete(id);
      return { status: 'ok' };
    },
  };
  return { repository, saved };
};

describe('importLevelAsDraft', () => {
  it('crée un nouveau brouillon à partir du document importé sans modifier son identifiant source', () => {
    const imported: LevelDocument = {
      ...source,
      id: 'campaign-01-la-bille-de-service-brouillon',
      metadata: { title: 'Niveau importé' },
    };
    const { repository, saved } = createMemoryRepository();

    const result = importLevelAsDraft(repository, imported, () => 'unique');

    expect(result).toEqual({ status: 'ok', draftId: 'import-unique' });
    expect(saved.get('import-unique')).toEqual({ ...imported, id: 'import-unique' });
    expect(imported.id).toBe('campaign-01-la-bille-de-service-brouillon');
  });

  it('génère un nouvel identifiant si le premier est déjà utilisé', () => {
    const existing = { ...source, id: 'import-taken', metadata: { title: 'À conserver' } };
    const { repository, saved } = createMemoryRepository([existing]);
    const generated = ['taken', 'available'];

    const result = importLevelAsDraft(repository, source, () => {
      const next = generated.shift();
      if (next === undefined) throw new Error('Identifiant de test épuisé.');
      return next;
    });

    expect(result).toEqual({ status: 'ok', draftId: 'import-available' });
    expect(saved.get('import-taken')).toEqual(existing);
  });

  it('ne remplace pas un brouillon conservé même si son identifiant manque à l’index', () => {
    const orphan = { ...source, id: 'import-orphan', metadata: { title: 'À garder' } };
    const { repository, saved } = createMemoryRepository([orphan]);
    const repositoryWithOrphan: DraftRepository = {
      ...repository,
      list: () => ({ status: 'ok', ids: [] }),
    };
    const generated = ['orphan', 'available'];

    const result = importLevelAsDraft(repositoryWithOrphan, source, () => {
      const next = generated.shift();
      if (next === undefined) throw new Error('Identifiant de test épuisé.');
      return next;
    });

    expect(result).toEqual({ status: 'ok', draftId: 'import-available' });
    expect(saved.get('import-orphan')).toEqual(orphan);
  });

  it('retourne une erreur de stockage sans tenter de sauvegarder', () => {
    const repository: DraftRepository = {
      list: () => ({ status: 'error', code: 'storage-unavailable' }),
      load: () => ({ status: 'error', code: 'storage-unavailable' }),
      save: () => ({ status: 'error', code: 'storage-unavailable' }),
      delete: () => ({ status: 'error', code: 'storage-unavailable' }),
    };

    expect(importLevelAsDraft(repository, source, () => 'unique')).toEqual({
      status: 'error',
      code: 'storage-unavailable',
    });
  });
});

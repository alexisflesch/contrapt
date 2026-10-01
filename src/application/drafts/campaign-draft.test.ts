import { describe, expect, it } from 'vitest';

import { embeddedLevels } from '../../content/embedded-levels';
import type { LevelDocument } from '../../domain/level-document';
import { createConstructionAttempt, movePlacement } from '../construction/construction-attempt';
import { executeCommand, createHistory } from '../history';
import type { DraftRepository } from './draft-repository';

import { campaignDraftId, createCampaignDraft, openCampaignDraft } from './campaign-draft';

const levelTwo = embeddedLevels.find(({ id }) => id === 'campaign-02-par-dessus-le-mur');
if (levelTwo === undefined) throw new Error('Niveau 2 embarqué introuvable.');

const updatedAt = '2026-10-01T12:00:00.000Z';

const createMemoryDraftRepository = (initial: readonly LevelDocument[] = []) => {
  const drafts = new Map(initial.map((document) => [document.id, document]));
  const saved: LevelDocument[] = [];
  const repository: DraftRepository = {
    list: () => ({ status: 'ok', ids: [...drafts.keys()] }),
    load: (id) => {
      const document = drafts.get(id);
      return { status: 'ok', creation: document === undefined ? null : { document, updatedAt } };
    },
    save: ({ document }) => {
      saved.push(document);
      drafts.set(document.id, document);
      return { status: 'ok' };
    },
    delete: (id) => {
      drafts.delete(id);
      return { status: 'ok' };
    },
  };
  return { repository, saved };
};

describe('brouillon d’un niveau de la campagne (U17)', () => {
  it('rouvre dans l’atelier un niveau à solution, ses objets à placer remis en place (U22)', () => {
    const puzzle: LevelDocument = {
      ...levelTwo,
      solution: {
        placements: [
          {
            inventoryId: levelTwo.inventory[0]?.id ?? '',
            transform: { position: { x: 4, y: 2 }, rotation: 0 },
          },
        ],
      },
    };

    const draft = createCampaignDraft(puzzle);

    expect(draft.solution).toBeUndefined();
    expect(draft.objects.filter(({ toPlace }) => toPlace === true)).toHaveLength(1);
    expect(draft.objects.at(-1)?.transform.position).toEqual({ x: 4, y: 2 });
  });

  it('copie le niveau sous un identifiant et un titre distincts, sans toucher l’original', () => {
    const original = structuredClone(levelTwo);

    const draft = createCampaignDraft(levelTwo);

    expect(draft.id).toBe('campaign-02-par-dessus-le-mur-brouillon');
    expect(campaignDraftId(levelTwo)).toBe(draft.id);
    expect(draft.metadata.title).toBe('Par-dessus le mur (brouillon)');
    expect({ ...draft, id: levelTwo.id, metadata: levelTwo.metadata }).toMatchObject({
      id: levelTwo.id,
      metadata: levelTwo.metadata,
    });
    expect(levelTwo).toEqual(original);
  });

  it('enregistre la copie la première fois', () => {
    const { repository, saved } = createMemoryDraftRepository();

    expect(openCampaignDraft(repository, levelTwo)).toEqual({
      status: 'ok',
      draftId: 'campaign-02-par-dessus-le-mur-brouillon',
    });
    expect(saved).toEqual([createCampaignDraft(levelTwo)]);
  });

  it('rouvre un brouillon existant sans écraser les ajustements de l’auteur', () => {
    const edited = {
      ...createCampaignDraft(levelTwo),
      metadata: { title: 'Par-dessus le mur modifié' },
    };
    const { repository, saved } = createMemoryDraftRepository([edited]);

    expect(openCampaignDraft(repository, levelTwo)).toEqual({
      status: 'ok',
      draftId: 'campaign-02-par-dessus-le-mur-brouillon',
    });
    expect(saved).toEqual([]);
  });

  it('signale un stockage indisponible sans lever d’exception', () => {
    const { repository } = createMemoryDraftRepository();
    const unavailable: DraftRepository = {
      ...repository,
      load: () => ({ status: 'error', code: 'storage-unavailable' }),
      save: () => ({ status: 'error', code: 'storage-unavailable' }),
    };

    expect(openCampaignDraft(unavailable, levelTwo)).toEqual({
      status: 'error',
      code: 'storage-unavailable',
    });
  });

  it('laisse l’auteur déplacer un objet de départ verrouillé pour le joueur', () => {
    const history = createHistory(createConstructionAttempt(createCampaignDraft(levelTwo)));
    const locked = levelTwo.objects.find(({ id }) => id === 'shelf');
    expect(locked?.permissions.move).toBe(false);
    const position = { x: 5.2, y: 2.3 };

    const asPlayer = executeCommand(
      history,
      movePlacement({ context: 'player', placementId: 'shelf', position }),
    );
    const asAuthor = executeCommand(
      history,
      movePlacement({ context: 'author', placementId: 'shelf', position }),
    );

    expect(asPlayer.status).toBe('rejected');
    expect(asAuthor.status).toBe('accepted');
    expect(
      asAuthor.history.state.document.objects.find(({ id }) => id === 'shelf')?.transform.position,
    ).toEqual(position);
  });
});

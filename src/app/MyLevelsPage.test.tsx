// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { creationFromLevel } from '../application/drafts/creation-from-level';
import type { ReceivedLevel } from '../application/received/received-level-repository';
import { embeddedLevels } from '../content/embedded-levels';
import { levelDocumentSchema, type LevelDocument } from '../domain/level-document';
import {
  encodeLevelFile,
  MAX_LEVEL_FILE_SIZE_BYTES,
} from '../infrastructure/level-file/level-file-codec';
import { levelFingerprint } from '../infrastructure/level-file/level-fingerprint';
import { decodeShareFragment } from '../infrastructure/level-share/level-share-codec';
import { createLocalStorageDraftRepository } from '../infrastructure/storage/local-storage-draft-repository';
import { createLocalStorageReceivedLevelRepository } from '../infrastructure/storage/local-storage-received-level-repository';

import { App } from './App';

const locked = { move: false, rotate: false, remove: false } as const;

/** A small puzzle level: nothing in it is « à placer », so it can be received. */
const puzzle = (id: string, metadata: LevelDocument['metadata']): LevelDocument =>
  levelDocumentSchema.parse({
    schemaVersion: 2,
    id,
    metadata,
    objects: [
      {
        id: 'ball-1',
        type: 'ball',
        props: {},
        transform: { position: { x: 1, y: 1 }, rotation: 0 },
        permissions: locked,
      },
      {
        id: 'basket-1',
        type: 'basket',
        props: {},
        transform: { position: { x: 7, y: 4.5 }, rotation: 0 },
        permissions: locked,
      },
    ],
    inventory: [],
    goal: { type: 'basket', ballId: 'ball-1', basketId: 'basket-1' },
    buildZones: [],
    scene: { min: { x: 0, y: 0 }, max: { x: 8, y: 5.5 } },
  });

/** A workshop: its beam is « à placer », so « Jouer » has a puzzle to open. */
const workshop = (id: string, title: string): LevelDocument =>
  levelDocumentSchema.parse({
    ...puzzle(id, { title }),
    objects: [
      ...puzzle(id, { title }).objects,
      {
        id: 'beam-1',
        type: 'beam',
        props: { size: 'medium' },
        transform: { position: { x: 4, y: 3 }, rotation: 0 },
        permissions: locked,
        toPlace: true,
      },
    ],
  });

const clockAt = (instant: string) => (): Date => new Date(instant);

const saveCreation = (document: LevelDocument, updatedAt: string, source?: LevelDocument): void => {
  const drafts = createLocalStorageDraftRepository(window.localStorage, clockAt(updatedAt));
  expect(drafts.save({ document, ...(source === undefined ? {} : { source }) }).status).toBe('ok');
};

const saveReceived = (level: ReceivedLevel): void => {
  expect(createLocalStorageReceivedLevelRepository(window.localStorage).save(level).status).toBe(
    'ok',
  );
};

const receivedLevel = (
  document: LevelDocument,
  fingerprint: string,
  receivedAt: string,
  extra: Partial<ReceivedLevel> = {},
): ReceivedLevel => ({
  id: `recu-${fingerprint}`,
  document,
  origin: 'link',
  receivedAt,
  solved: false,
  ...extra,
});

const openMyLevels = (): void => {
  window.history.replaceState(null, '', '/my-levels');
  render(<App />);
};

const section = (name: 'Mes créations' | 'Niveaux reçus'): HTMLElement =>
  screen.getByRole('region', { name });

const cardTitles = (name: 'Mes créations' | 'Niveaux reçus'): string[] =>
  within(section(name))
    .queryAllByRole('region')
    .map((card) => card.getAttribute('aria-label') ?? '');

const card = (title: string): HTMLElement => screen.getByRole('region', { name: title });

const chooseFile = (name: string, contents: string): void => {
  const input = document.querySelector<HTMLInputElement>('input[type="file"]');
  if (input === null) throw new Error('Sélecteur de fichier introuvable.');
  const file = new File([contents], name, { type: 'application/json' });
  Object.defineProperty(file, 'text', { value: () => Promise.resolve(contents) });
  fireEvent.change(input, { target: { files: [file] } });
};

const storedDraftIds = (): readonly string[] => {
  const list = createLocalStorageDraftRepository(window.localStorage, () => new Date()).list();
  return list.status === 'ok' ? list.ids : [];
};

const storedReceivedIds = (): readonly string[] => {
  const list = createLocalStorageReceivedLevelRepository(window.localStorage).list();
  return list.status === 'ok' ? list.ids : [];
};

const campaignLevel = (index: number): LevelDocument => {
  const level = embeddedLevels[index];
  if (level === undefined) throw new Error('Niveau de campagne introuvable.');
  return level;
};

describe('page « Mes niveaux » (M9, ADR 0015 § Page « Mes niveaux »)', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.history.replaceState(null, '', '/');
  });

  afterEach(() => {
    cleanup();
  });

  it('s’ouvre depuis le menu et l’accueil, avec deux sections vides et leurs invites', () => {
    render(<App />);
    const destinations = screen.getByRole('navigation', { name: 'Explorer TinkerBolt' });
    expect(within(destinations).getByRole('link', { name: /Mes niveaux/u })).toHaveAttribute(
      'href',
      '/my-levels',
    );

    fireEvent.click(screen.getByRole('button', { name: 'Ouvrir le menu' }));
    expect(screen.queryByRole('button', { name: 'Importer un fichier JSON' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Mes niveaux' }));

    expect(window.location.pathname).toBe('/my-levels');
    expect(within(section('Mes créations')).getByText(/aucune création/u)).toBeVisible();
    expect(within(section('Niveaux reçus')).getByText(/aucun niveau reçu/u)).toBeVisible();
    expect(
      within(section('Mes créations')).getByRole('button', { name: 'Nouveau niveau' }),
    ).toBeVisible();
    expect(
      within(section('Niveaux reçus')).getByRole('button', { name: 'Importer un fichier' }),
    ).toBeVisible();
  });

  it('redirige `/import` vers `/my-levels`', () => {
    window.history.replaceState(null, '', '/import');
    render(<App />);

    expect(window.location.pathname).toBe('/my-levels');
    expect(section('Niveaux reçus')).toBeVisible();
  });

  it('liste les créations et les niveaux reçus du plus récent au plus ancien', () => {
    saveCreation(workshop('creation-ancienne', 'Création ancienne'), '2026-09-01T08:00:00.000Z');
    saveCreation(workshop('creation-recente', 'Création récente'), '2026-09-20T08:00:00.000Z');
    saveCreation(workshop('creation-moyenne', 'Création moyenne'), '2026-09-10T08:00:00.000Z');
    saveReceived(
      receivedLevel(
        puzzle('recu-a', { title: 'Reçu récent' }),
        'a'.repeat(16),
        '2026-09-25T08:00:00.000Z',
      ),
    );
    saveReceived(
      receivedLevel(
        puzzle('recu-b', { title: 'Reçu ancien' }),
        'b'.repeat(16),
        '2026-09-02T08:00:00.000Z',
      ),
    );

    openMyLevels();

    expect(cardTitles('Mes créations')).toEqual([
      'Création récente',
      'Création moyenne',
      'Création ancienne',
    ]);
    expect(cardTitles('Niveaux reçus')).toEqual(['Reçu récent', 'Reçu ancien']);
  });

  it('montre l’état, l’auteur et la première source d’un niveau reçu, en texte brut', () => {
    saveReceived(
      receivedLevel(
        puzzle('recu-resolu', {
          title: '<b>Le saut</b>',
          author: '<i>Lili</i>',
          basedOn: [
            { title: 'La chute', author: 'Max' },
            { title: 'Plus ancien', author: 'Zoé' },
          ],
        }),
        'c'.repeat(16),
        '2026-09-25T08:00:00.000Z',
        {
          solved: true,
          bestObjectCount: 2,
          playerSolution: { placements: [] },
        },
      ),
    );
    saveReceived(
      receivedLevel(
        puzzle('recu-neuf', { title: 'Pas encore' }),
        'd'.repeat(16),
        '2026-09-01T08:00:00.000Z',
      ),
    );

    openMyLevels();

    const solved = card('<b>Le saut</b>');
    expect(within(solved).getByText('par <i>Lili</i>')).toBeVisible();
    expect(within(solved).getByText('d’après La chute (par Max)')).toBeVisible();
    expect(within(solved).queryByText(/Plus ancien/u)).toBeNull();
    expect(within(solved).getByText('Résolu')).toBeVisible();
    expect(within(solved).getByText('Record : 2 objets')).toBeVisible();
    expect(solved.querySelector('b, i')).toBeNull();
    expect(within(card('Pas encore')).getByText('Pas encore résolu')).toBeVisible();
    expect(within(card('Pas encore')).queryByText(/^par /u)).toBeNull();
  });

  it('montre la description d’un niveau reçu en texte brut, et rien sans description (M14b)', () => {
    saveReceived(
      receivedLevel(
        puzzle('recu-decrit', { title: 'Décrit', description: 'Pousse <b>x</b> dans le panier.' }),
        'e'.repeat(16),
        '2026-09-25T08:00:00.000Z',
      ),
    );
    saveReceived(
      receivedLevel(
        puzzle('recu-muet', { title: 'Muet' }),
        'f'.repeat(16),
        '2026-09-01T08:00:00.000Z',
      ),
    );

    openMyLevels();

    const described = card('Décrit');
    const description = within(described).getByText('Pousse <b>x</b> dans le panier.');
    expect(description).toBeVisible();
    expect(description).toHaveClass('level-card-description');
    expect(described.querySelector('b')).toBeNull();
    expect(card('Muet').querySelector('.level-card-description')).toBeNull();
  });

  it('supprime une création après confirmation, et l’annulation ne supprime rien', () => {
    saveCreation(workshop('creation-a-garder', 'À garder'), '2026-09-01T08:00:00.000Z');
    openMyLevels();

    fireEvent.click(within(card('À garder')).getByRole('button', { name: 'Supprimer' }));
    const dialog = screen.getByRole('dialog', { name: 'Confirmer la suppression' });
    expect(within(dialog).getByText(/« À garder »/u)).toBeVisible();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Annuler' }));

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(cardTitles('Mes créations')).toEqual(['À garder']);
    expect(storedDraftIds()).toEqual(['creation-a-garder']);

    fireEvent.click(within(card('À garder')).getByRole('button', { name: 'Supprimer' }));
    fireEvent.click(
      within(screen.getByRole('dialog', { name: 'Confirmer la suppression' })).getByRole('button', {
        name: 'Supprimer',
      }),
    );

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(cardTitles('Mes créations')).toEqual([]);
    expect(storedDraftIds()).toEqual([]);
  });

  it('supprime un niveau reçu après confirmation, et l’annulation ne supprime rien', () => {
    const id = `recu-${'e'.repeat(16)}`;
    saveReceived(
      receivedLevel(
        puzzle('recu-sup', { title: 'À effacer' }),
        'e'.repeat(16),
        '2026-09-01T08:00:00.000Z',
      ),
    );
    openMyLevels();

    fireEvent.click(within(card('À effacer')).getByRole('button', { name: 'Supprimer' }));
    fireEvent.click(
      within(screen.getByRole('dialog', { name: 'Confirmer la suppression' })).getByRole('button', {
        name: 'Annuler',
      }),
    );
    expect(storedReceivedIds()).toEqual([id]);

    fireEvent.click(within(card('À effacer')).getByRole('button', { name: 'Supprimer' }));
    fireEvent.click(
      within(screen.getByRole('dialog', { name: 'Confirmer la suppression' })).getByRole('button', {
        name: 'Supprimer',
      }),
    );

    expect(cardTitles('Niveaux reçus')).toEqual([]);
    expect(storedReceivedIds()).toEqual([]);
  });

  it('importe un fichier valide comme niveau reçu, en tête de liste, sans quitter la page', async () => {
    saveReceived(
      receivedLevel(
        puzzle('recu-avant', { title: 'Reçu avant' }),
        'f'.repeat(16),
        '2026-01-01T08:00:00.000Z',
      ),
    );
    const imported = puzzle('mon-puzzle', { title: 'Mon puzzle', author: 'Lili' });
    openMyLevels();

    chooseFile('mon-puzzle.json', encodeLevelFile(imported));

    expect(await screen.findByText('« Mon puzzle » est dans tes niveaux reçus.')).toHaveAttribute(
      'role',
      'status',
    );
    expect(window.location.pathname).toBe('/my-levels');
    expect(cardTitles('Niveaux reçus')).toEqual(['Mon puzzle', 'Reçu avant']);
    const id = `recu-${await levelFingerprint(imported)}`;
    const stored = createLocalStorageReceivedLevelRepository(window.localStorage).load(id);
    expect(stored.status === 'ok' && stored.level).toMatchObject({
      id,
      document: imported,
      origin: 'file',
      solved: false,
    });
  });

  it('remet en tête un niveau déjà reçu qu’on importe à nouveau', async () => {
    const again = puzzle('deja-recu', { title: 'Déjà reçu' });
    const fingerprint = await levelFingerprint(again);
    saveReceived(receivedLevel(again, fingerprint, '2026-01-01T08:00:00.000Z'));
    saveReceived(
      receivedLevel(
        puzzle('recu-recent', { title: 'Plus récent' }),
        '1'.repeat(16),
        '2026-02-01T08:00:00.000Z',
      ),
    );
    openMyLevels();
    expect(cardTitles('Niveaux reçus')).toEqual(['Plus récent', 'Déjà reçu']);

    chooseFile('deja-recu.json', encodeLevelFile(again));

    expect(await screen.findByText('« Déjà reçu » est dans tes niveaux reçus.')).toBeVisible();
    expect(cardTitles('Niveaux reçus')).toEqual(['Déjà reçu', 'Plus récent']);
    expect(storedReceivedIds()).toHaveLength(2);
  });

  it('refuse un JSON invalide sans rien enregistrer', async () => {
    openMyLevels();
    chooseFile('casse.json', '{ JSON cassé');

    expect(await screen.findByRole('alert')).toHaveTextContent('JSON valide');
    expect(storedReceivedIds()).toEqual([]);
  });

  it('refuse un fichier trop gros avant de le lire', async () => {
    openMyLevels();
    chooseFile('trop-grand.json', ' '.repeat(MAX_LEVEL_FILE_SIZE_BYTES + 1));

    expect(await screen.findByRole('alert')).toHaveTextContent('256 Kio');
    expect(storedReceivedIds()).toEqual([]);
  });

  it('refuse un atelier qui porte un objet « à placer », sans rien enregistrer', async () => {
    openMyLevels();
    chooseFile('atelier.json', encodeLevelFile(workshop('mon-atelier', 'Mon atelier')));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Ce fichier est un atelier, pas un niveau à jouer.',
    );
    expect(storedReceivedIds()).toEqual([]);
    expect(cardTitles('Niveaux reçus')).toEqual([]);
  });

  it('duplique une création en « (copie) » avec la même source, en tête de liste', () => {
    const source = puzzle('origine', { title: 'Origine' });
    saveCreation(workshop('creation-1', 'Ma machine'), '2026-09-01T08:00:00.000Z', source);
    openMyLevels();

    fireEvent.click(within(card('Ma machine')).getByRole('button', { name: 'Dupliquer' }));

    expect(cardTitles('Mes créations')).toEqual(['Ma machine (copie)', 'Ma machine']);
    const copyId = storedDraftIds().find((id) => id !== 'creation-1') ?? '';
    expect(copyId).toMatch(/^creation-[0-9a-f]{32}$/u);
    const copy = createLocalStorageDraftRepository(window.localStorage, () => new Date()).load(
      copyId,
    );
    expect(copy.status === 'ok' && copy.creation).toMatchObject({
      document: { id: copyId, metadata: { title: 'Ma machine (copie)' } },
      source,
    });
  });

  it('ouvre une création dans l’atelier avec « Modifier »', () => {
    saveCreation(workshop('creation-1', 'Ma machine'), '2026-09-01T08:00:00.000Z');
    openMyLevels();

    fireEvent.click(within(card('Ma machine')).getByRole('button', { name: 'Modifier' }));

    expect(window.location.pathname).toBe('/editor');
    expect(window.location.search).toBe('?draft=creation-1');
    expect(screen.getByText('Mode éditeur')).toBeVisible();
  });

  it('joue le puzzle d’une création avec « Jouer », et revient à son atelier', () => {
    saveCreation(workshop('creation-1', 'Ma machine'), '2026-09-01T08:00:00.000Z');
    openMyLevels();

    fireEvent.click(within(card('Ma machine')).getByRole('button', { name: 'Jouer' }));

    expect(window.location.search).toBe('?draft=creation-1');
    expect(screen.getByText('Mode joueur')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Retour à l’atelier' }));
    expect(screen.getByText('Mode éditeur')).toBeVisible();
  });

  it('ne propose pas « Jouer » sur une création sans objet à placer', () => {
    saveCreation(
      puzzle('creation-vide', { title: 'Sans objet à placer' }),
      '2026-09-01T08:00:00.000Z',
    );
    openMyLevels();

    expect(
      within(card('Sans objet à placer')).getByRole('button', { name: 'Jouer' }),
    ).toBeDisabled();
  });

  it('ouvre la boîte d’export vérifiée pour partager une création', () => {
    saveCreation(
      puzzle('creation-vide', { title: 'Sans objet à placer' }),
      '2026-09-01T08:00:00.000Z',
    );
    openMyLevels();

    fireEvent.click(within(card('Sans objet à placer')).getByRole('button', { name: 'Partager' }));

    const dialog = screen.getByRole('dialog', { name: 'Exporter le niveau' });
    expect(within(dialog).getByRole('alert')).toHaveTextContent('Aucun objet n’est à placer');
  });

  it('partage un niveau reçu tel quel, sans vérification', async () => {
    const document = puzzle('recu-partage', { title: 'À partager', author: 'Lili' });
    saveReceived(receivedLevel(document, '2'.repeat(16), '2026-09-01T08:00:00.000Z'));
    openMyLevels();

    fireEvent.click(within(card('À partager')).getByRole('button', { name: 'Partager' }));
    const dialog = screen.getByRole('dialog', { name: 'Partager le niveau' });
    expect(within(dialog).getByRole('button', { name: 'Télécharger le fichier' })).toBeEnabled();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Copier le lien de partage' }));

    // jsdom has no clipboard: the link is shown to be copied by hand.
    const link = await within(dialog).findByRole('textbox', { name: 'Lien de partage' });
    const fragment = new URL((link as HTMLTextAreaElement).value).hash;
    expect(await decodeShareFragment(fragment)).toEqual({ status: 'ok', document });
  });

  it('joue un niveau reçu sur `/my-levels/:id/play`', () => {
    saveReceived(
      receivedLevel(
        puzzle('recu-jeu', { title: 'À jouer' }),
        '3'.repeat(16),
        '2026-09-01T08:00:00.000Z',
      ),
    );
    openMyLevels();
    expect(within(card('À jouer')).getByRole('button', { name: 'Modifier' })).toBeEnabled();

    fireEvent.click(within(card('À jouer')).getByRole('button', { name: 'Jouer' }));

    expect(window.location.pathname).toBe(`/my-levels/recu-${'3'.repeat(16)}/play`);
    expect(screen.getByText('Mode joueur')).toBeVisible();
    expect(screen.getByRole('region', { name: 'Plateau de jeu' })).toBeVisible();
  });

  it('dit qu’un niveau reçu inconnu est introuvable, avec un lien vers « Mes niveaux »', () => {
    window.history.replaceState(null, '', `/my-levels/recu-${'4'.repeat(16)}/play`);
    render(<App />);

    expect(screen.getByRole('alert')).toHaveTextContent('introuvable');
    expect(screen.getByRole('link', { name: 'Mes niveaux' })).toHaveAttribute('href', '/my-levels');
  });

  it('marque « Verrouillé » la création d’un niveau de campagne verrouillé, avec Supprimer seulement', () => {
    const second = campaignLevel(1);
    saveCreation(
      creationFromLevel(second, { createId: () => `${second.id}-brouillon` }).document,
      '2026-09-01T08:00:00.000Z',
      second,
    );
    const first = campaignLevel(0);
    saveCreation(
      creationFromLevel(first, { createId: () => `${first.id}-brouillon` }).document,
      '2026-08-01T08:00:00.000Z',
      first,
    );
    openMyLevels();

    const lockedCard = card(`${second.metadata.title} (remix)`);
    expect(within(lockedCard).getByText('Verrouillé')).toBeVisible();
    expect(
      within(lockedCard)
        .getAllByRole('button')
        .map((button) => button.textContent),
    ).toEqual(['Supprimer']);
    const openCard = card(`${first.metadata.title} (remix)`);
    expect(within(openCard).queryByText('Verrouillé')).toBeNull();
    expect(within(openCard).getByRole('button', { name: 'Modifier' })).toBeEnabled();
  });

  it('ouvre l’atelier libre avec « Nouveau niveau »', () => {
    openMyLevels();

    fireEvent.click(screen.getByRole('button', { name: 'Nouveau niveau' }));

    expect(window.location.pathname).toBe('/editor');
    expect(window.location.search).toBe('');
  });
});

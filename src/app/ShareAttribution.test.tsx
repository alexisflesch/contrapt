// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { DraftCreation, DraftRepository } from '../application/drafts/draft-repository';
import type { ReceivedLevel } from '../application/received/received-level-repository';
import { levelDocumentSchema, type LevelDocument } from '../domain/level-document';
import { decodeShareFragment } from '../infrastructure/level-share/level-share-codec';
import { createLocalStorageDraftRepository } from '../infrastructure/storage/local-storage-draft-repository';
import { createLocalStoragePreferencesRepository } from '../infrastructure/storage/local-storage-preferences-repository';
import { createLocalStorageReceivedLevelRepository } from '../infrastructure/storage/local-storage-received-level-repository';

import { App } from './App';

const locked = { move: false, rotate: false, remove: false } as const;

/** The U22 machine as a workshop: its short beam is « à placer » and the complete machine wins. */
const machine = (id: string, metadata: LevelDocument['metadata']): LevelDocument =>
  levelDocumentSchema.parse({
    schemaVersion: 2,
    id,
    metadata,
    objects: [
      {
        id: 'ball-1',
        type: 'ball',
        props: {},
        transform: { position: { x: 2.3, y: 1.177 }, rotation: 0 },
        permissions: locked,
      },
      {
        id: 'slope',
        type: 'beam',
        props: { size: 'medium' },
        transform: { position: { x: 2.2, y: 1.6 }, rotation: 0.2617993877991494 },
        permissions: locked,
      },
      {
        id: 'basket-1',
        type: 'basket',
        props: {},
        transform: { position: { x: 6.9, y: 4.9 }, rotation: 0 },
        permissions: locked,
      },
      {
        id: 'placement-1',
        type: 'beam',
        props: { size: 'short' },
        transform: { position: { x: 5, y: 2.15 }, rotation: 0 },
        permissions: locked,
        toPlace: true,
      },
    ],
    inventory: [],
    goal: { type: 'basket', ballId: 'ball-1', basketId: 'basket-1' },
    buildZones: [{ min: { x: 3.6, y: 1.7 }, max: { x: 7, y: 2.9 } }],
    scene: { min: { x: 0, y: 0 }, max: { x: 8, y: 5.5 } },
  });

const draftStorage = (): DraftRepository =>
  createLocalStorageDraftRepository(window.localStorage, () => new Date('2026-10-01T12:00:00Z'));

const saveCreation = (document: LevelDocument, source?: LevelDocument): void => {
  expect(
    draftStorage().save({ document, ...(source === undefined ? {} : { source }) }).status,
  ).toBe('ok');
};

const storedCreation = (id: string): DraftCreation => {
  const loaded = draftStorage().load(id);
  if (loaded.status !== 'ok' || loaded.creation === null) throw new Error('Création introuvable.');
  return loaded.creation;
};

const boardCanvasRect: DOMRect = {
  x: 0,
  y: 0,
  left: 0,
  top: 0,
  right: 800,
  bottom: 450,
  width: 800,
  height: 450,
  toJSON() {
    return this;
  },
};

const openAt = (path: string): void => {
  window.history.replaceState(null, '', path);
  render(<App />);
};

const exportDialog = (): HTMLElement => screen.getByRole('dialog', { name: 'Exporter le niveau' });

/** jsdom has no clipboard: the dialog shows the link to copy by hand. */
const sharedDocument = async (dialog: HTMLElement): Promise<LevelDocument> => {
  fireEvent.click(within(dialog).getByRole('button', { name: 'Copier le lien de partage' }));
  const field = await within(dialog).findByRole('textbox', { name: 'Lien de partage' });
  if (!(field instanceof HTMLTextAreaElement)) throw new Error('Lien introuvable.');
  const decoded = await decodeShareFragment(new URL(field.value).hash);
  if (decoded.status !== 'ok') throw new Error(`Lien illisible : ${decoded.status}`);
  return decoded.document;
};

const fillAttribution = (dialog: HTMLElement, title: string, pseudo: string): void => {
  fireEvent.change(within(dialog).getByRole('textbox', { name: 'Nom du niveau' }), {
    target: { value: title },
  });
  fireEvent.change(within(dialog).getByRole('textbox', { name: 'Pseudo (facultatif)' }), {
    target: { value: pseudo },
  });
};

describe('partager : titre, pseudo et licence (M14)', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.spyOn(HTMLCanvasElement.prototype, 'getBoundingClientRect').mockReturnValue(boardCanvasRect);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('enregistre dans la création, depuis l’atelier, le titre et le pseudo exportés, annulables', async () => {
    saveCreation(machine('machine', { title: 'Machine' }));
    openAt('/editor?draft=machine');

    fireEvent.click(screen.getByRole('button', { name: 'Exporter le niveau' }));
    fillAttribution(exportDialog(), ' Grand saut ', ' Lili ');
    const shared = await sharedDocument(exportDialog());

    expect(shared.metadata).toEqual({ title: 'Grand saut', author: 'Lili' });
    expect(storedCreation('machine').document.metadata).toEqual({
      title: 'Grand saut',
      author: 'Lili',
    });

    fireEvent.click(within(exportDialog()).getByRole('button', { name: 'Fermer l’export' }));
    fireEvent.click(screen.getByRole('button', { name: 'Annuler' }));
    expect(storedCreation('machine').document.metadata).toEqual({ title: 'Grand saut' });
    fireEvent.click(screen.getByRole('button', { name: 'Annuler' }));
    expect(storedCreation('machine').document.metadata).toEqual({ title: 'Machine' });
  });

  it('préremplit le pseudo de l’export suivant après rechargement', async () => {
    saveCreation(machine('premiere', { title: 'Première' }));
    saveCreation(machine('seconde', { title: 'Seconde' }));
    openAt('/editor?draft=premiere');
    fireEvent.click(screen.getByRole('button', { name: 'Exporter le niveau' }));
    fillAttribution(exportDialog(), 'Première', 'Lili');
    await sharedDocument(exportDialog());
    cleanup();

    openAt('/editor?draft=seconde');
    fireEvent.click(screen.getByRole('button', { name: 'Exporter le niveau' }));

    expect(
      within(exportDialog()).getByRole('textbox', { name: 'Pseudo (facultatif)' }),
    ).toHaveValue('Lili');
    expect((await sharedDocument(exportDialog())).metadata.author).toBe('Lili');
  });

  it('exporte et enregistre le pseudo depuis « Partager » d’une création de « Mes niveaux »', async () => {
    const source = machine('origine', { title: 'Origine', author: 'Max' });
    saveCreation(
      machine('remix', {
        title: 'Origine (remix)',
        basedOn: [{ title: 'Origine', author: 'Max' }],
      }),
      source,
    );
    openAt('/my-levels');

    const card = screen.getByRole('region', { name: 'Origine (remix)' });
    fireEvent.click(within(card).getByRole('button', { name: 'Partager' }));
    expect(
      within(exportDialog()).getByRole('textbox', { name: 'Pseudo (facultatif)' }),
    ).toHaveValue('');
    fillAttribution(exportDialog(), 'Mon remix', 'Lili');
    const shared = await sharedDocument(exportDialog());

    const metadata = {
      title: 'Mon remix',
      author: 'Lili',
      basedOn: [{ title: 'Origine', author: 'Max' }],
    };
    expect(shared.metadata).toEqual(metadata);
    const stored = storedCreation('remix');
    expect(stored.document).toEqual(machine('remix', metadata));
    expect(stored.source).toEqual(source);
    expect(
      within(screen.getByRole('region', { name: 'Mes créations' })).getByRole('region', {
        name: 'Mon remix',
      }),
    ).toBeVisible();
    expect(createLocalStoragePreferencesRepository(window.localStorage).load()).toEqual({
      status: 'ok',
      preferences: { author: 'Lili' },
    });
  });

  it('enregistre dans la création, depuis l’atelier, la description exportée, annulable (M14b)', async () => {
    saveCreation(machine('machine', { title: 'Machine', author: 'Max' }));
    openAt('/editor?draft=machine');

    fireEvent.click(screen.getByRole('button', { name: 'Exporter le niveau' }));
    const description = within(exportDialog()).getByRole('textbox', {
      name: 'Description (facultatif)',
    });
    expect(description).toHaveValue('');
    fireEvent.change(description, { target: { value: ' Une rampe, puis le panier. ' } });
    const shared = await sharedDocument(exportDialog());

    const metadata = { title: 'Machine', author: 'Max', description: 'Une rampe, puis le panier.' };
    expect(shared.metadata).toEqual(metadata);
    expect(storedCreation('machine').document.metadata).toEqual(metadata);

    fireEvent.click(within(exportDialog()).getByRole('button', { name: 'Fermer l’export' }));
    fireEvent.click(screen.getByRole('button', { name: 'Annuler' }));
    expect(storedCreation('machine').document.metadata).toEqual({
      title: 'Machine',
      author: 'Max',
    });
    expect(screen.getByRole('button', { name: 'Annuler' })).toBeDisabled();
  });

  it('enregistre la description depuis « Partager » d’une création de « Mes niveaux » (M14b)', async () => {
    const source = machine('origine', {
      title: 'Origine',
      description: 'La description de Max.',
      author: 'Max',
    });
    saveCreation(
      machine('remix', {
        title: 'Origine (remix)',
        description: 'La description de Max.',
        basedOn: [{ title: 'Origine', author: 'Max' }],
      }),
      source,
    );
    openAt('/my-levels');

    fireEvent.click(
      within(screen.getByRole('region', { name: 'Origine (remix)' })).getByRole('button', {
        name: 'Partager',
      }),
    );
    const description = within(exportDialog()).getByRole('textbox', {
      name: 'Description (facultatif)',
    });
    expect(description).toHaveValue('La description de Max.');
    fireEvent.change(description, { target: { value: 'Ma version, plus rapide.' } });
    const shared = await sharedDocument(exportDialog());

    const metadata = {
      title: 'Origine (remix)',
      description: 'Ma version, plus rapide.',
      basedOn: [{ title: 'Origine', author: 'Max' }],
    };
    expect(shared.metadata).toEqual(metadata);
    const stored = storedCreation('remix');
    expect(stored.document).toEqual(machine('remix', metadata));
    expect(stored.source).toEqual(source);
  });

  it('partage un niveau reçu tel quel, sans champ de titre ni de pseudo', () => {
    const document = machine('recu', { title: 'Reçu', author: 'Max' });
    const level: ReceivedLevel = {
      id: `recu-${'5'.repeat(16)}`,
      document,
      origin: 'link',
      receivedAt: '2026-09-01T08:00:00.000Z',
      solved: false,
    };
    expect(createLocalStorageReceivedLevelRepository(window.localStorage).save(level).status).toBe(
      'ok',
    );
    openAt('/my-levels');

    const card = screen.getByRole('region', { name: 'Reçu' });
    fireEvent.click(within(card).getByRole('button', { name: 'Partager' }));

    const dialog = screen.getByRole('dialog', { name: 'Partager le niveau' });
    expect(within(dialog).queryByRole('textbox', { name: 'Pseudo (facultatif)' })).toBeNull();
    expect(within(dialog).queryByRole('textbox', { name: 'Nom du niveau' })).toBeNull();
    expect(within(dialog).queryByRole('textbox', { name: 'Description (facultatif)' })).toBeNull();
  });
});

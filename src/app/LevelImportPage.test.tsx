// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { embeddedLevels } from '../content/embedded-levels';
import type { LevelDocument } from '../domain/level-document';
import { MAX_LEVEL_FILE_SIZE_BYTES } from '../infrastructure/level-file/level-file-codec';
import { createLocalStorageDraftRepository } from '../infrastructure/storage/local-storage-draft-repository';

import { App } from './App';

const testInstant = '2026-10-01T12:00:00.000Z';
const testClock = (): Date => new Date(testInstant);

const source = embeddedLevels[0];
if (source === undefined) throw new Error('Niveau embarqué introuvable.');

const openImportPage = (): void => {
  window.history.replaceState(null, '', '/');
  render(
    <App draftRepository={createLocalStorageDraftRepository(window.localStorage, testClock)} />,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Ouvrir le menu' }));
  fireEvent.click(screen.getByRole('button', { name: 'Importer un fichier JSON' }));
};

const chooseFile = (name: string, contents: string): void => {
  const input = document.querySelector<HTMLInputElement>('input[type="file"]');
  if (input === null) throw new Error('Sélecteur de fichier introuvable.');
  const file = new File([contents], name, { type: 'application/json' });
  Object.defineProperty(file, 'text', { value: () => Promise.resolve(contents) });
  fireEvent.change(input, {
    target: { files: [file] },
  });
};

describe('importation d’un niveau JSON', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/');
    window.localStorage.clear();
  });

  afterEach(() => {
    cleanup();
  });

  it('valide le fichier, l’enregistre dans un nouveau brouillon puis l’ouvre dans l’éditeur', async () => {
    const existing = {
      ...source,
      id: 'import-kept',
      metadata: { title: 'Brouillon existant' },
    } satisfies LevelDocument;
    const imported = {
      ...source,
      id: 'import-kept',
      metadata: { title: 'Mon puzzle' },
    } satisfies LevelDocument;
    const drafts = createLocalStorageDraftRepository(window.localStorage, testClock);
    expect(drafts.save({ document: existing }).status).toBe('ok');
    openImportPage();

    expect(screen.getByRole('region', { name: 'Importer un niveau JSON' })).toBeVisible();
    expect(screen.queryByRole('region', { name: 'Plateau de jeu' })).toBeNull();
    chooseFile('mon-puzzle.json', JSON.stringify(imported));

    expect(
      await screen.findByText('« Mon puzzle » est valide et prêt à être importé.'),
    ).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Importer dans un nouveau brouillon' }));

    expect(await screen.findByText('Mode éditeur')).toBeVisible();
    const ids = drafts.list();
    expect(ids.status).toBe('ok');
    if (ids.status !== 'ok') throw new Error('Index de brouillons illisible.');
    const importId = ids.ids.find((id) => id !== existing.id);
    expect(importId).toMatch(/^import-/u);
    expect(drafts.load(existing.id)).toEqual({
      status: 'ok',
      creation: { document: existing, updatedAt: testInstant },
    });
    expect(drafts.load(importId ?? '')).toEqual({
      status: 'ok',
      creation: { document: { ...imported, id: importId }, updatedAt: testInstant },
    });
  });

  it('annonce un JSON invalide et ne modifie aucun brouillon', async () => {
    const drafts = createLocalStorageDraftRepository(window.localStorage, testClock);
    openImportPage();
    chooseFile('casse.json', '{ JSON cassé');

    expect(await screen.findByRole('alert')).toHaveTextContent('JSON valide');
    expect(screen.queryByRole('button', { name: 'Importer dans un nouveau brouillon' })).toBeNull();
    expect(drafts.list()).toEqual({ status: 'ok', ids: [] });
  });

  it('refuse un fichier qui dépasse la limite avant de le lire', async () => {
    openImportPage();
    chooseFile('trop-grand.json', ' '.repeat(MAX_LEVEL_FILE_SIZE_BYTES + 1));

    expect(await screen.findByRole('alert')).toHaveTextContent('256 Kio');
    expect(screen.queryByRole('button', { name: 'Importer dans un nouveau brouillon' })).toBeNull();
  });
});

// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { creationFromLevel } from '../application/drafts/creation-from-level';
import type { DraftCreation } from '../application/drafts/draft-repository';
import { levelDocumentSchema, type LevelDocument } from '../domain/level-document';
import { createLocalStorageDraftRepository } from '../infrastructure/storage/local-storage-draft-repository';

import { App } from './App';

const testClock = (): Date => new Date('2026-10-01T12:00:00.000Z');
const locked = { move: false, rotate: false, remove: false } as const;

/** A received puzzle: decor with a lever and a fan, the author's beam, button and two wires. */
const source: LevelDocument = levelDocumentSchema.parse({
  schemaVersion: 2,
  id: 'recu-0123456789abcdef',
  metadata: { title: 'Le grand saut', author: 'Lili' },
  objects: [
    {
      id: 'ball',
      type: 'ball',
      props: {},
      transform: { position: { x: 1, y: 1 }, rotation: 0 },
      permissions: locked,
    },
    {
      id: 'basket',
      type: 'basket',
      props: {},
      transform: { position: { x: 11, y: 6 }, rotation: 0 },
      permissions: locked,
    },
    {
      id: 'decor-lever',
      type: 'lever',
      props: { position: 'left' },
      transform: { position: { x: 2, y: 6 }, rotation: 0 },
      permissions: locked,
    },
    {
      id: 'decor-fan',
      type: 'fan',
      props: { state: 'off' },
      transform: { position: { x: 4, y: 6 }, rotation: 0 },
      permissions: locked,
    },
    {
      id: 'decor-conveyor',
      type: 'conveyor',
      props: { direction: 'stopped' },
      transform: { position: { x: 8, y: 6 }, rotation: 0 },
      permissions: locked,
    },
  ],
  inventory: [
    {
      id: 'beams',
      type: 'beam',
      props: { size: 'medium' },
      quantity: 1,
      permissions: { move: true, rotate: true, remove: true },
    },
    {
      id: 'buttons',
      type: 'button',
      props: {},
      quantity: 1,
      permissions: { move: true, rotate: false, remove: true },
    },
    {
      id: 'wires',
      type: 'wire',
      props: {},
      quantity: 2,
      permissions: { move: false, rotate: false, remove: true },
    },
  ],
  goal: { type: 'basket', ballId: 'ball', basketId: 'basket' },
  buildZones: [{ min: { x: 0, y: 0 }, max: { x: 12, y: 7 } }],
  scene: { min: { x: 0, y: 0 }, max: { x: 12, y: 7 } },
  solution: {
    placements: [
      { inventoryId: 'beams', transform: { position: { x: 8.25, y: 3.75 }, rotation: 0.3 } },
      {
        inventoryId: 'buttons',
        placementId: 'auteur-bouton',
        transform: { position: { x: 7, y: 2 }, rotation: 0 },
      },
    ],
    wires: [
      { id: 'fil-bouton', inventoryId: 'wires', sourceId: 'auteur-bouton', targetId: 'decor-fan' },
      {
        id: 'fil-levier',
        inventoryId: 'wires',
        sourceId: 'decor-lever',
        targetId: 'decor-conveyor',
      },
    ],
  },
});

const creationId = 'creation-m12';
const draftStorage = () => createLocalStorageDraftRepository(window.localStorage, testClock);

const saveCreation = (creation: { document: LevelDocument; source?: LevelDocument }): void => {
  expect(draftStorage().save(creation).status).toBe('ok');
};

const storedCreation = (): DraftCreation => {
  const loaded = draftStorage().load(creationId);
  if (loaded.status !== 'ok' || loaded.creation === null) throw new Error('Création introuvable.');
  return loaded.creation;
};

const toPlaceTypes = (document: LevelDocument): string[] =>
  document.objects.filter(({ toPlace }) => toPlace === true).map(({ type }) => type);

const intactCreation = creationFromLevel(source, { createId: () => creationId });

const openCreation = (): void => {
  window.history.replaceState(null, '', `/editor?draft=${creationId}`);
  render(<App />);
  expect(screen.getByText('Atelier')).toBeVisible();
};

const openMenu = (): HTMLElement => {
  fireEvent.click(screen.getByRole('button', { name: 'Ouvrir le menu' }));
  return screen.getByRole('navigation', { name: 'Menu principal' });
};

const revealEntryName = 'Révéler la solution de l’auteur';

const boardWires = (): string | null =>
  screen.getByRole('img', { name: 'Rendu du plateau' }).getAttribute('data-wires');

const revealAndConfirm = (): void => {
  fireEvent.click(within(openMenu()).getByRole('button', { name: revealEntryName }));
  const dialog = screen.getByRole('dialog', { name: revealEntryName });
  expect(
    within(dialog).getByText(/La solution de l’auteur sera posée sur le plateau/u),
  ).toBeVisible();
  fireEvent.click(within(dialog).getByRole('button', { name: 'Révéler la solution' }));
  expect(screen.queryByRole('dialog', { name: revealEntryName })).toBeNull();
};

describe('révéler la solution de l’auteur dans l’atelier (M12, ADR 0015 § Révéler)', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.history.replaceState(null, '', '/');
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('n’offre pas l’entrée dans l’atelier libre, créé de zéro', () => {
    window.history.replaceState(null, '', '/editor');
    render(<App />);

    expect(within(openMenu()).queryByRole('button', { name: revealEntryName })).toBeNull();
  });

  it('n’offre pas l’entrée pour une création sans source', () => {
    saveCreation({ document: intactCreation.document });
    openCreation();

    expect(within(openMenu()).queryByRole('button', { name: revealEntryName })).toBeNull();
  });

  it('n’offre pas l’entrée quand la source n’a pas de solution', () => {
    const { solution: ignoredSolution, ...withoutSolution } = source;
    void ignoredSolution;
    saveCreation(creationFromLevel(withoutSolution, { createId: () => creationId }));
    openCreation();

    expect(within(openMenu()).queryByRole('button', { name: revealEntryName })).toBeNull();
  });

  it('pose la solution « à placer » après confirmation, et l’enregistre', () => {
    saveCreation(intactCreation);
    openCreation();
    expect(toPlaceTypes(storedCreation().document)).toEqual([]);

    revealAndConfirm();

    // `restoreSolution` names a pose after its inventory entry, as `workshopFromPuzzle` does.
    expect(boardWires()).toBe('buttons-2>decor-fan decor-lever>decor-conveyor');
    const stored = storedCreation();
    expect(toPlaceTypes(stored.document)).toEqual(['beam', 'button']);
    expect(stored.source).toEqual(source);
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('« Annuler » dans la boîte de confirmation ne change rien', () => {
    saveCreation(intactCreation);
    openCreation();

    fireEvent.click(within(openMenu()).getByRole('button', { name: revealEntryName }));
    const dialog = screen.getByRole('dialog', { name: revealEntryName });
    expect(within(dialog).getByRole('button', { name: 'Annuler' })).toHaveFocus();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Annuler' }));

    expect(screen.queryByRole('dialog', { name: revealEntryName })).toBeNull();
    expect(boardWires()).toBe('');
    expect(toPlaceTypes(storedCreation().document)).toEqual([]);
    expect(screen.getByRole('button', { name: 'Annuler' })).toBeDisabled();
  });

  it('s’annule d’un seul « Annuler » de l’historique', () => {
    saveCreation(intactCreation);
    openCreation();
    revealAndConfirm();

    fireEvent.click(screen.getByRole('button', { name: 'Annuler' }));

    expect(boardWires()).toBe('');
    expect(toPlaceTypes(storedCreation().document)).toEqual([]);
    expect(screen.getByRole('button', { name: 'Annuler' })).toBeDisabled();
  });

  it('dit discrètement combien de fils ont été ignorés', () => {
    const withoutFan = {
      ...intactCreation.document,
      objects: intactCreation.document.objects.filter(({ id }) => id !== 'decor-fan'),
    };
    saveCreation({ document: withoutFan, source });
    openCreation();

    revealAndConfirm();

    expect(boardWires()).toBe('decor-lever>decor-conveyor');
    expect(
      screen.getByText('1 fil de la solution de l’auteur n’a pas pu être posé.'),
    ).toHaveAttribute('role', 'status');
  });

  it('n’offre pas l’entrée en jouant le puzzle', () => {
    saveCreation(intactCreation);
    openCreation();
    revealAndConfirm();

    fireEvent.click(screen.getByRole('button', { name: 'Essayer en joueur' }));
    expect(screen.getByText('Atelier', { selector: '.level-mode' })).toBeVisible();

    expect(within(openMenu()).queryByRole('button', { name: revealEntryName })).toBeNull();
  });
});

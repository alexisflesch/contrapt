// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { DraftCreation, DraftRepository } from '../application/drafts/draft-repository';
import { createLocalStorageDraftRepository } from '../infrastructure/storage/local-storage-draft-repository';

import { App } from './App';

const testClock = (): Date => new Date('2026-10-01T12:00:00.000Z');
const draftStorage = (): DraftRepository =>
  createLocalStorageDraftRepository(window.localStorage, testClock);

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

const tapWorldPoint = (x: number, y: number): void => {
  const board = screen.getByRole('region', { name: 'Plateau de jeu' });
  const canvas = within(board).getByRole('img', { name: 'Rendu du plateau' });
  const [originX, originY] = (canvas.getAttribute('data-camera-origin') ?? '')
    .split(',')
    .map(Number);
  const zoom = Number(canvas.getAttribute('data-camera-zoom'));
  if (originX === undefined || originY === undefined || !(zoom > 0)) {
    throw new Error('Cadrage caméra invalide dans le test.');
  }
  for (const type of ['pointerdown', 'pointerup'] as const) {
    const event = new Event(type, { bubbles: true });
    Object.defineProperties(event, {
      pointerId: { configurable: true, value: 1 },
      pointerType: { configurable: true, value: 'touch' },
      clientX: { configurable: true, value: (x - originX) * zoom },
      clientY: { configurable: true, value: (y - originY) * zoom },
    });
    fireEvent(board, event);
  }
};

/** The workshop's one blue ball, posed from the catalogue: a committed change. */
const placeBall = (): void => {
  const toggle = screen.queryByRole('button', { name: 'Ouvrir le catalogue' });
  if (toggle !== null) fireEvent.click(toggle);
  fireEvent.click(screen.getByRole('button', { name: /^Balle/u }));
  tapWorldPoint(8, 3);
};

const blueBalls = (): string | null =>
  screen.getByRole('img', { name: 'Rendu du plateau' }).getAttribute('data-blue-balls');

const draftIdInUrl = (): string => {
  const id = new URLSearchParams(window.location.search).get('draft');
  if (id === null) throw new Error('Aucune création dans l’URL.');
  return id;
};

const storedCreation = (id: string): DraftCreation => {
  const loaded = draftStorage().load(id);
  if (loaded.status !== 'ok' || loaded.creation === null) throw new Error('Création introuvable.');
  return loaded.creation;
};

const storedIds = (): readonly string[] => {
  const listed = draftStorage().list();
  if (listed.status !== 'ok') throw new Error('Dépôt illisible.');
  return listed.ids;
};

describe('atelier libre enregistré (M13, ADR 0015 § Atelier libre)', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.history.replaceState(null, '', '/editor');
    vi.spyOn(HTMLCanvasElement.prototype, 'getBoundingClientRect').mockReturnValue(boardCanvasRect);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('ouvrir l’atelier sans rien faire ne crée aucune création et laisse l’URL', () => {
    render(<App />);

    expect(screen.getByText('Atelier')).toBeVisible();
    expect(storedIds()).toEqual([]);
    expect(window.localStorage.length).toBe(0);
    expect(window.location.pathname).toBe('/editor');
    expect(window.location.search).toBe('');
  });

  it('affiche dans l’en-tête le titre du niveau édité, avec « Atelier » (V3)', () => {
    render(<App draftRepository={draftStorage()} />);

    const header = screen.getByRole('banner');
    expect(within(header).getByText('Atelier de niveau')).toBeVisible();
    expect(within(header).getByText('Atelier')).toBeVisible();
    expect(header).not.toHaveTextContent('Mode éditeur');
  });

  it('poser un objet enregistre une création `creation-<aléa>` et met son identifiant dans l’URL', () => {
    render(<App draftRepository={draftStorage()} />);

    placeBall();

    expect(window.location.pathname).toBe('/editor');
    expect(draftIdInUrl()).toMatch(/^creation-[0-9a-f]{32}$/u);
    expect(storedIds()).toEqual([draftIdInUrl()]);
    const creation = storedCreation(draftIdInUrl());
    expect(creation.document.id).toBe(draftIdInUrl());
    expect(creation.document.objects.filter(({ type }) => type === 'ball')).toHaveLength(2);
    expect(creation.source).toBeUndefined();
    expect(creation.updatedAt).toBe(testClock().toISOString());
  });

  it('une création partie de zéro n’a pas de description (M14b)', () => {
    render(<App draftRepository={draftStorage()} />);

    placeBall();

    const { metadata } = storedCreation(draftIdInUrl()).document;
    expect(metadata).toEqual({ title: 'Atelier de niveau' });
    expect('description' in metadata).toBe(false);
  });

  it('remplace l’entrée d’historique du navigateur au lieu d’en ajouter une', () => {
    render(<App />);
    const entriesBefore = window.history.length;

    placeBall();

    expect(draftIdInUrl()).toMatch(/^creation-/u);
    expect(window.history.length).toBe(entriesBefore);
  });

  it('recharger l’adresse retrouve l’objet posé', () => {
    render(<App />);
    placeBall();
    const posed = blueBalls();
    expect(posed).not.toBe('');
    cleanup();

    render(<App />);

    expect(screen.getByText('Atelier')).toBeVisible();
    expect(blueBalls()).toBe(posed);
  });

  it('garde l’historique et le même enregistrement après le changement d’URL : « Annuler » retire l’objet', () => {
    render(<App />);
    placeBall();
    const id = draftIdInUrl();
    expect(blueBalls()).not.toBe('');

    fireEvent.click(screen.getByRole('button', { name: 'Annuler' }));

    expect(blueBalls()).toBe('');
    expect(draftIdInUrl()).toBe(id);
    expect(storedIds()).toEqual([id]);
    expect(storedCreation(id).document.objects.filter(({ type }) => type === 'ball')).toHaveLength(
      1,
    );
  });

  it('enregistre les modifications suivantes dans la même création', () => {
    render(<App />);
    placeBall();
    const id = draftIdInUrl();

    fireEvent.click(screen.getByRole('button', { name: 'Annuler' }));
    fireEvent.click(screen.getByRole('button', { name: 'Rétablir' }));

    expect(draftIdInUrl()).toBe(id);
    expect(storedIds()).toEqual([id]);
    expect(storedCreation(id).document.objects.filter(({ type }) => type === 'ball')).toHaveLength(
      2,
    );
  });

  it('« Atelier de construction » depuis une création enregistrée ouvre un atelier neuf, sans la modifier', () => {
    render(<App />);
    placeBall();
    const id = draftIdInUrl();

    fireEvent.click(screen.getByRole('button', { name: 'Ouvrir le menu' }));
    fireEvent.click(
      within(screen.getByRole('navigation', { name: 'Menu principal' })).getByRole('button', {
        name: 'Atelier',
      }),
    );

    expect(window.location.search).toBe('');
    expect(blueBalls()).toBe('');
    expect(storedIds()).toEqual([id]);

    placeBall();

    expect(draftIdInUrl()).not.toBe(id);
    expect(storedIds()).toHaveLength(2);
    expect(storedCreation(id).document.objects.filter(({ type }) => type === 'ball')).toHaveLength(
      2,
    );
  });

  it('continue sans changer d’URL quand l’enregistrement échoue, et réessaie à la modification suivante', () => {
    const real = draftStorage();
    let failing = true;
    const repository: DraftRepository = {
      ...real,
      save: (creation) =>
        failing ? { status: 'error', code: 'quota-exceeded' } : real.save(creation),
    };
    render(<App draftRepository={repository} />);

    placeBall();

    expect(window.location.search).toBe('');
    expect(blueBalls()).not.toBe('');
    expect(storedIds()).toEqual([]);
    expect(screen.queryByRole('alert')).toBeNull();

    failing = false;
    fireEvent.click(screen.getByRole('button', { name: 'Annuler' }));

    expect(draftIdInUrl()).toMatch(/^creation-/u);
    expect(storedIds()).toEqual([draftIdInUrl()]);
    expect(blueBalls()).toBe('');
  });

  it('ne crée rien quand le stockage est indisponible, sans quitter l’atelier', () => {
    const repository: DraftRepository = {
      list: () => ({ status: 'error', code: 'storage-unavailable' }),
      load: () => ({ status: 'error', code: 'storage-unavailable' }),
      save: () => ({ status: 'error', code: 'storage-unavailable' }),
      delete: () => ({ status: 'error', code: 'storage-unavailable' }),
    };
    render(<App draftRepository={repository} />);

    placeBall();

    expect(window.location.search).toBe('');
    expect(blueBalls()).not.toBe('');
  });
});

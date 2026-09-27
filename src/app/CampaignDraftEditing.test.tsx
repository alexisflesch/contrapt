// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ProgressRepository } from '../application/progression/progress-repository';
import { embeddedLevels } from '../content/embedded-levels';
import { createLocalStorageDraftRepository } from '../infrastructure/storage/local-storage-draft-repository';

import { App } from './App';

const levelTwo = embeddedLevels.find(({ id }) => id === 'level-2-le-pont');
if (levelTwo === undefined) throw new Error('Niveau 2 embarqué introuvable.');
const pristineLevelTwo = structuredClone(levelTwo);

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
  tapBoard((x - originX) * zoom, (y - originY) * zoom);
};

const tapBoard = (clientX: number, clientY: number): void => {
  const board = screen.getByRole('region', { name: 'Plateau de jeu' });
  for (const type of ['pointerdown', 'pointerup'] as const) {
    const event = new Event(type, { bubbles: true });
    Object.defineProperties(event, {
      pointerId: { configurable: true, value: 1 },
      pointerType: { configurable: true, value: 'touch' },
      clientX: { configurable: true, value: clientX },
      clientY: { configurable: true, value: clientY },
    });
    fireEvent(board, event);
  }
};

const createProgressRepository = () => {
  const save = vi.fn(() => ({ status: 'ok' as const }));
  const repository: ProgressRepository = { load: () => ({ status: 'ok', progress: {} }), save };
  return { repository, save };
};

describe('éditer un niveau de la campagne (U17)', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/');
    window.localStorage.clear();
    vi.spyOn(HTMLCanvasElement.prototype, 'getBoundingClientRect').mockReturnValue(boardCanvasRect);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('ouvre depuis la liste un brouillon distinct du niveau en mode auteur', () => {
    const { repository, save } = createProgressRepository();
    window.history.replaceState(null, '', '/levels');
    render(<App progressRepository={repository} />);

    const card = screen.getByRole('region', { name: 'Niveau 2' });
    fireEvent.click(within(card).getByRole('button', { name: 'Éditer le niveau 2' }));

    expect(window.location.pathname).toBe('/editor');
    expect(new URLSearchParams(window.location.search).get('draft')).toBe(
      'level-2-le-pont-brouillon',
    );
    expect(screen.getByText('Éditeur · Le pont (brouillon)')).toBeVisible();
    expect(screen.getByText('Mode éditeur')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Exporter le niveau' })).toBeVisible();

    const stored = createLocalStorageDraftRepository(window.localStorage).load(
      'level-2-le-pont-brouillon',
    );
    expect(stored.status === 'ok' ? stored.document?.metadata.title : null).toBe(
      'Le pont (brouillon)',
    );
    expect(window.localStorage.getItem('tinkerbolt:draft:level-2-le-pont')).toBeNull();
    expect(save).not.toHaveBeenCalled();
    expect(levelTwo).toEqual(pristineLevelTwo);
  });

  it('enregistre les ajustements de l’auteur dans le brouillon, jamais dans le niveau', () => {
    window.history.replaceState(null, '', '/levels');
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Éditer le niveau 2' }));

    // The ramp is locked for the player (`move: false`); the author context ignores it.
    tapWorldPoint(5.0, 2.3);
    const properties = screen.getByRole('region', { name: /^Propriétés de/ });
    fireEvent.click(within(properties).getByRole('button', { name: 'Vers la droite' }));

    const stored = createLocalStorageDraftRepository(window.localStorage).load(
      'level-2-le-pont-brouillon',
    );
    const storedRamp =
      stored.status === 'ok' ? stored.document?.objects.find(({ id }) => id === 'ramp') : undefined;
    expect(storedRamp?.transform.position.x).toBeGreaterThan(5.0);
    expect(levelTwo).toEqual(pristineLevelTwo);
  });

  it('rouvre le brouillon existant plutôt que de l’écraser', () => {
    const drafts = createLocalStorageDraftRepository(window.localStorage);
    drafts.save({
      ...levelTwo,
      id: 'level-2-le-pont-brouillon',
      metadata: { title: 'Mon pont' },
    });
    window.history.replaceState(null, '', '/levels');
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'Éditer le niveau 2' }));

    expect(screen.getByText('Éditeur · Mon pont')).toBeVisible();
  });

  it('explique qu’un brouillon introuvable ne peut pas être ouvert', () => {
    window.history.replaceState(null, '', '/editor?draft=inconnu');
    render(<App />);

    expect(screen.getByRole('alert')).toHaveTextContent('Ce brouillon est introuvable');
    expect(screen.getByRole('link', { name: 'Liste des niveaux' })).toBeVisible();
    expect(screen.queryByRole('region', { name: 'Plateau de jeu' })).toBeNull();
  });

  const storedDraft = () => {
    const stored = createLocalStorageDraftRepository(window.localStorage).load(
      'level-2-le-pont-brouillon',
    );
    if (stored.status !== 'ok' || stored.document == null) {
      throw new Error('Brouillon introuvable.');
    }
    return stored.document;
  };

  const ballColours = (): { readonly red: string | null; readonly blue: string | null } => {
    const canvas = screen.getByRole('img', { name: 'Rendu du plateau' });
    return {
      red: canvas.getAttribute('data-red-balls'),
      blue: canvas.getAttribute('data-blue-balls'),
    };
  };

  const placeFromCatalogue = (card: string, x: number, y: number): void => {
    const toggle = screen.queryByRole('button', { name: 'Ouvrir le catalogue' });
    if (toggle !== null) fireEvent.click(toggle);
    const drawer = screen.getByRole('region', { name: 'Objets disponibles' });
    fireEvent.click(within(drawer).getByRole('button', { name: card }));
    tapWorldPoint(x, y);
  };

  it('ajoute au brouillon un objet absent de l’inventaire du niveau (U20)', () => {
    window.history.replaceState(null, '', '/levels');
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Éditer le niveau 2' }));
    const before = storedDraft();

    placeFromCatalogue('Masse', 6.5, 1.0);

    const after = storedDraft();
    expect(after.objects).toHaveLength(before.objects.length + 1);
    expect(after.objects.at(-1)?.type).toBe('mass');
    expect(after.inventory).toEqual(before.inventory);
    expect(levelTwo).toEqual(pristineLevelTwo);
  });

  it('ajoute une balle bleue sans jamais changer la balle de l’objectif (U20)', () => {
    window.history.replaceState(null, '', '/levels');
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Éditer le niveau 2' }));
    expect(ballColours()).toEqual({ red: 'ball-1', blue: '' });

    placeFromCatalogue('Balle bleue', 3.0, 0.8);
    const blueBallId = storedDraft().objects.at(-1)?.id ?? '';
    expect(storedDraft().goal.ballId).toBe('ball-1');
    expect(ballColours()).toEqual({ red: 'ball-1', blue: blueBallId });

    fireEvent.click(screen.getByRole('button', { name: 'Annuler' }));
    expect(storedDraft().goal.ballId).toBe('ball-1');
    expect(ballColours()).toEqual({ red: 'ball-1', blue: '' });
  });
});

// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { embeddedLevels } from '../content/embedded-levels';
import type { LevelDocument } from '../domain/level-document';
import { createLocalStorageDraftRepository } from '../infrastructure/storage/local-storage-draft-repository';

import { App } from './App';

const levelOne = embeddedLevels.find(({ id }) => id === 'campaign-01-la-bille-de-service');
if (levelOne === undefined) throw new Error('Niveau 1 embarqué introuvable.');
const { solution: ignoredSolution, ...levelOneWithoutSolution } = levelOne;
void ignoredSolution;

/** Level 1 with its reference beam in place, still fixed: the author's complete machine. */
const machine: LevelDocument = {
  ...levelOneWithoutSolution,
  id: 'machine-u22',
  metadata: { title: 'Machine U22' },
  objects: [
    ...levelOneWithoutSolution.objects,
    {
      id: 'placement-1',
      type: 'beam',
      props: { size: 'short' },
      transform: { position: { x: 5, y: 2.15 }, rotation: 0 },
      permissions: { move: false, rotate: false, remove: false },
    },
  ],
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

const storedDraft = (): LevelDocument | null => {
  const result = createLocalStorageDraftRepository(window.localStorage).load('machine-u22');
  return result.status === 'ok' ? result.document : null;
};

const openMachine = (): void => {
  createLocalStorageDraftRepository(window.localStorage).save(machine);
  window.history.replaceState(null, '', '/editor?draft=machine-u22');
  render(<App />);
};

const selectBeam = (): void => {
  tapWorldPoint(5, 2.15);
  const openProperties = screen.queryByRole('button', { name: 'Ouvrir les propriétés' });
  if (openProperties !== null) fireEvent.click(openProperties);
};

describe('atelier créateur de puzzles (U22)', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/');
    window.localStorage.clear();
    vi.spyOn(HTMLCanvasElement.prototype, 'getBoundingClientRect').mockReturnValue(boardCanvasRect);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('règle un objet « À placer » dans l’inspecteur, au toucher, et l’annule', () => {
    openMachine();
    selectBeam();

    const fixed = screen.getByRole('button', { name: 'Fixe' });
    const toPlace = screen.getByRole('button', { name: 'À placer' });
    expect(fixed).toHaveAttribute('aria-pressed', 'true');
    expect(toPlace).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(toPlace);

    expect(screen.getByRole('button', { name: 'À placer' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(storedDraft()?.objects.find(({ id }) => id === 'placement-1')?.toPlace).toBe(true);

    fireEvent.click(screen.getByRole('button', { name: 'Annuler' }));

    expect(storedDraft()?.objects.find(({ id }) => id === 'placement-1')?.toPlace).toBeUndefined();
  });

  it('ne propose pas le réglage pour la balle et le panier de l’objectif', () => {
    openMachine();
    tapWorldPoint(6.9, 4.9);
    const openProperties = screen.queryByRole('button', { name: 'Ouvrir les propriétés' });
    if (openProperties !== null) fireEvent.click(openProperties);

    expect(screen.getByText('Panier')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'À placer' })).toBeNull();
  });

  it('teste comme un joueur, objets à placer dans le tiroir, puis revient à l’atelier', () => {
    openMachine();
    selectBeam();
    fireEvent.click(screen.getByRole('button', { name: 'À placer' }));

    fireEvent.click(screen.getByRole('button', { name: 'Jouer le puzzle' }));

    expect(screen.getByText('Mode joueur')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Exporter le niveau' })).toBeNull();
    const drawerToggle = screen.queryByRole('button', { name: 'Ouvrir le catalogue' });
    if (drawerToggle !== null) fireEvent.click(drawerToggle);
    expect(screen.getByRole('button', { name: /^Poutre courte/ })).toHaveTextContent('1');

    fireEvent.click(screen.getByRole('button', { name: 'Retour à l’atelier' }));

    expect(screen.getByText('Mode éditeur')).toBeVisible();
    expect(storedDraft()?.objects.find(({ id }) => id === 'placement-1')?.toPlace).toBe(true);
    selectBeam();
    expect(screen.getByRole('button', { name: 'À placer' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('explique au lieu de tester quand aucun objet n’est à placer', () => {
    openMachine();

    fireEvent.click(screen.getByRole('button', { name: 'Jouer le puzzle' }));

    expect(screen.getByText('Mode éditeur')).toBeVisible();
    expect(screen.getByText(/Aucun objet n’est à placer/u)).toBeVisible();
  });

  it('explique que l’esquisse doit être calibrée avant son export', () => {
    openMachine();
    selectBeam();
    fireEvent.click(screen.getByRole('button', { name: 'À placer' }));

    fireEvent.click(screen.getByRole('button', { name: 'Exporter le niveau' }));

    const dialog = screen.getByRole('dialog', { name: 'Exporter le niveau' });
    expect(within(dialog).getByRole('alert')).toBeVisible();
  });
});

// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import styles from '../ui/styles.css?raw';

import { App } from './App';
import { screenPointToWorld } from './screen-point-to-world';

type PointerEventType = 'pointerdown' | 'pointermove' | 'pointerup' | 'pointercancel';

interface TestPointerEvent {
  readonly pointerId: number;
  readonly pointerType: string;
  readonly clientX: number;
  readonly clientY: number;
}

const firePointerEvent = (
  element: HTMLElement,
  type: PointerEventType,
  properties: TestPointerEvent,
): void => {
  const event = new Event(type, { bubbles: true });
  Object.defineProperties(event, {
    pointerId: { configurable: true, value: properties.pointerId },
    pointerType: { configurable: true, value: properties.pointerType },
    clientX: { configurable: true, value: properties.clientX },
    clientY: { configurable: true, value: properties.clientY },
  });
  fireEvent(element, event);
};

type AnimationFrameCallback = (timestamp: number) => void;

const createAnimationFrameHarness = () => {
  let nextFrameId = 0;
  const pendingFrames = new Map<number, AnimationFrameCallback>();
  const requestAnimationFrame = vi.fn((callback: AnimationFrameCallback): number => {
    const frameId = nextFrameId;
    nextFrameId += 1;
    pendingFrames.set(frameId, callback);
    return frameId;
  });
  const cancelAnimationFrame = vi.fn((frameId: number): void => {
    pendingFrames.delete(frameId);
  });

  vi.stubGlobal('requestAnimationFrame', requestAnimationFrame);
  vi.stubGlobal('cancelAnimationFrame', cancelAnimationFrame);

  return {
    requestAnimationFrame,
    flush(timestamp: number): void {
      const callbacks = [...pendingFrames.values()];
      pendingFrames.clear();
      for (const callback of callbacks) callback(timestamp);
    },
  };
};

const placeBeam = (): HTMLElement => {
  fireEvent.click(screen.getByRole('button', { name: 'Ouvrir le catalogue' }));
  fireEvent.click(screen.getByRole('button', { name: /Poutre/ }));

  const board = screen.getByRole('region', { name: 'Plateau de jeu' });
  firePointerEvent(board, 'pointerdown', {
    pointerId: 1,
    pointerType: 'touch',
    clientX: 320,
    clientY: 240,
  });
  firePointerEvent(board, 'pointerup', {
    pointerId: 1,
    pointerType: 'touch',
    clientX: 320,
    clientY: 240,
  });

  return board;
};

const openEmbeddedLevelOne = (): void => {
  fireEvent.click(screen.getByRole('button', { name: 'Ouvrir le menu' }));
  fireEvent.click(screen.getByRole('button', { name: 'Lancer le niveau 1' }));
};

const advanceSimulationToResult = (
  animationFrames: ReturnType<typeof createAnimationFrameHarness>,
): void => {
  const fixedStepMilliseconds = 1000 / 60;

  act(() => {
    animationFrames.flush(0);
    for (let frame = 1; frame <= 180; frame += 1) {
      animationFrames.flush(frame * fixedStepMilliseconds);
    }
  });
};

/**
 * jsdom does no layout, so every element's `getBoundingClientRect()` is a
 * zero rect by default. That degenerate size is a real edge case the pure
 * camera module handles safely (ADR 0007's absolute zoom floor), but it does
 * not exercise the actual fit/conversion math a browser would run, and it
 * silently changes what a hardcoded click coordinate means in world units.
 * Stubbing the canvas's rect to a plausible, non-zero size — chosen at the
 * workshop scene's own 16:9 aspect ratio, which also happens to reproduce
 * the historical default zoom of 48 px/unit — keeps every click coordinate
 * in this file meaningful without hand-tuning each one.
 */
const BOARD_CANVAS_WIDTH_IN_CSS_PIXELS = 800;
const BOARD_CANVAS_HEIGHT_IN_CSS_PIXELS = 450;

const boardCanvasRect: DOMRect = {
  x: 0,
  y: 0,
  left: 0,
  top: 0,
  right: BOARD_CANVAS_WIDTH_IN_CSS_PIXELS,
  bottom: BOARD_CANVAS_HEIGHT_IN_CSS_PIXELS,
  width: BOARD_CANVAS_WIDTH_IN_CSS_PIXELS,
  height: BOARD_CANVAS_HEIGHT_IN_CSS_PIXELS,
  toJSON() {
    return this;
  },
};

describe('coque Contrapt!', () => {
  beforeEach(() => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getBoundingClientRect').mockReturnValue(boardCanvasRect);
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('présente le plateau et les quatre familles du catalogue', () => {
    render(<App />);

    expect(screen.getByRole('heading', { name: 'Contrapt!' })).toBeVisible();
    expect(screen.getByText('Éditeur de niveaux')).toBeVisible();
    expect(screen.getByText('Mode éditeur')).toBeVisible();
    expect(screen.getByRole('region', { name: 'Plateau de jeu' })).toBeVisible();
    expect(screen.queryByText('Préparez votre machine')).not.toBeInTheDocument();
    expect(
      screen.queryByText('Le plateau est prêt pour votre prochaine construction.'),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Objets disponibles' })).toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: 'Ouvrir le catalogue' }));

    expect(screen.getByRole('button', { name: /Balle/ })).toBeVisible();
    expect(screen.getByRole('button', { name: /Panier/ })).toBeVisible();
    expect(screen.getByRole('button', { name: /Poutre/ })).toBeVisible();
    expect(screen.getByRole('button', { name: /Bascule/ })).toBeVisible();
  });

  it('rend un canvas accessible superposé au plateau et conserve son aide tactile', () => {
    render(<App />);

    const board = screen.getByRole('region', { name: 'Plateau de jeu' });
    const canvas = within(board).getByRole('img', { name: 'Rendu du plateau' });

    expect(canvas.tagName).toBe('CANVAS');
    expect(within(board).queryByText('Préparez votre machine')).not.toBeInTheDocument();
    expect(
      within(board).queryByText('Le plateau est prêt pour votre prochaine construction.'),
    ).not.toBeInTheDocument();
    expect(board.querySelector('.scene-ground')).not.toBeInTheDocument();
    expect(styles).toContain('board-generic-v0.png');

    for (const controlName of ['Zoom arrière', 'Ajuster à la scène', 'Zoom avant']) {
      expect(screen.getByRole('button', { name: controlName })).toBeVisible();
    }
  });

  it('affiche un aperçu de placement qui suit la souris puis le geste tactile', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'Ouvrir le catalogue' }));
    fireEvent.click(screen.getByRole('button', { name: /Panier/ }));

    const board = screen.getByRole('region', { name: 'Plateau de jeu' });
    expect(
      screen.queryByRole('img', { name: 'Aperçu de placement : Panier' }),
    ).not.toBeInTheDocument();

    firePointerEvent(board, 'pointermove', {
      pointerId: 1,
      pointerType: 'mouse',
      clientX: 120,
      clientY: 100,
    });

    const preview = screen.getByRole('img', { name: 'Aperçu de placement : Panier' });
    expect(preview).toBeVisible();
    const initialPosition = preview.getAttribute('data-position');
    expect(initialPosition).not.toBeNull();

    firePointerEvent(board, 'pointermove', {
      pointerId: 1,
      pointerType: 'mouse',
      clientX: 260,
      clientY: 180,
    });

    expect(preview).toHaveAttribute('data-position');
    const mousePosition = preview.getAttribute('data-position');
    expect(mousePosition).not.toBe(initialPosition);

    firePointerEvent(board, 'pointerdown', {
      pointerId: 2,
      pointerType: 'touch',
      clientX: 120,
      clientY: 100,
    });
    firePointerEvent(board, 'pointermove', {
      pointerId: 2,
      pointerType: 'touch',
      clientX: 260,
      clientY: 180,
    });

    expect(preview.getAttribute('data-position')).not.toBe(mousePosition);
  });

  it('replie le catalogue sans superposer de texte dans la zone de construction', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'Ouvrir le catalogue' }));
    fireEvent.click(screen.getByRole('button', { name: /Panier/ }));

    const board = screen.getByRole('region', { name: 'Plateau de jeu' });
    expect(within(board).queryByText(/Placement actif\s*:\s*Panier/i)).not.toBeInTheDocument();
    expect(
      within(board).queryByRole('button', { name: 'Annuler le placement' }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ouvrir le catalogue' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  });

  it('permet de replier puis de rouvrir le catalogue avec un contenu accessible', () => {
    render(<App />);

    const openButton = screen.getByRole('button', { name: 'Ouvrir le catalogue' });
    expect(openButton).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('button', { name: /Balle/ })).not.toBeInTheDocument();

    fireEvent.click(openButton);

    const collapseButton = screen.getByRole('button', { name: 'Replier le catalogue' });
    expect(collapseButton).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('button', { name: /Balle/ })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Fermer le catalogue' })).toBeVisible();

    fireEvent.click(collapseButton);

    const reopenedButton = screen.getByRole('button', { name: 'Ouvrir le catalogue' });
    expect(reopenedButton).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('button', { name: /Balle/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Fermer le catalogue' })).not.toBeInTheDocument();

    fireEvent.click(reopenedButton);

    expect(screen.getByRole('button', { name: 'Replier le catalogue' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    expect(screen.getByRole('button', { name: /Balle/ })).toBeVisible();
  });

  it('ferme le tiroir lorsqu’on touche le scrim', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'Ouvrir le catalogue' }));
    fireEvent.click(screen.getByRole('button', { name: 'Fermer le catalogue' }));

    expect(screen.getByRole('button', { name: 'Ouvrir le catalogue' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    expect(screen.queryByRole('button', { name: 'Fermer le catalogue' })).not.toBeInTheDocument();
  });

  it('conserve la même géométrie de workspace pendant l’ouverture', () => {
    render(<App />);

    const workspace = screen.getByRole('region', { name: 'Espace de construction' });
    const boundsBefore = workspace.getBoundingClientRect();

    fireEvent.click(screen.getByRole('button', { name: 'Ouvrir le catalogue' }));

    expect(workspace.getBoundingClientRect()).toEqual(boundsBefore);
  });

  it('laisse les actions essentielles visibles lorsque le tiroir est replié', () => {
    render(<App />);

    expect(screen.getByRole('button', { name: 'Ouvrir le catalogue' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );

    for (const actionName of [
      'Ouvrir le menu',
      'Annuler',
      'Rétablir',
      'Tester',
      'Zoom arrière',
      'Ajuster à la scène',
      'Zoom avant',
    ]) {
      expect(screen.getByRole('button', { name: actionName })).toBeVisible();
    }
  });

  it('lance la simulation depuis l’atelier puis propose de revenir à l’édition', () => {
    render(<App />);

    const testButton = screen.getByRole('button', { name: 'Tester' });
    expect(testButton).toBeEnabled();

    fireEvent.click(testButton);

    expect(screen.getByText('Simulation en cours')).toBeVisible();
    const resetButton = screen.getByRole('button', { name: 'Réinitialiser' });
    expect(resetButton).toBeVisible();
    const board = screen.getByRole('region', { name: 'Plateau de jeu' });
    expect(
      within(board).queryByRole('button', { name: 'Mettre en pause' }),
    ).not.toBeInTheDocument();
    expect(within(board).queryByRole('button', { name: 'Réinitialiser' })).not.toBeInTheDocument();

    fireEvent.click(resetButton);

    expect(screen.queryByText('Simulation en cours')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tester' })).toBeEnabled();
  });

  it('avance la physique par RAF contrôlé et permet de la mettre en pause puis de reprendre', () => {
    const animationFrames = createAnimationFrameHarness();
    render(<App />);

    const testButton = screen.getByRole('button', { name: 'Tester' });
    expect(testButton).toBeEnabled();
    fireEvent.click(testButton);

    const board = screen.getByRole('region', { name: 'Plateau de jeu' });
    const canvas = within(board).getByRole('img', { name: 'Rendu du plateau' });
    expect(screen.getByRole('button', { name: 'Mettre en pause' })).toBeVisible();
    expect(canvas).toHaveAttribute('data-simulation-step', '0');
    const initialBallPosition = canvas.getAttribute('data-simulation-ball-position');
    expect(initialBallPosition).not.toBeNull();
    expect(animationFrames.requestAnimationFrame).toHaveBeenCalled();

    const fixedStepMilliseconds = 1000 / 60;
    act(() => {
      animationFrames.flush(0);
    });
    act(() => {
      animationFrames.flush(fixedStepMilliseconds);
    });

    expect(canvas).toHaveAttribute('data-simulation-step', '1');
    expect(canvas.getAttribute('data-simulation-ball-position')).not.toBe(initialBallPosition);

    fireEvent.click(screen.getByRole('button', { name: 'Mettre en pause' }));
    expect(screen.getByRole('button', { name: 'Reprendre' })).toBeVisible();
    const pausedStep = canvas.getAttribute('data-simulation-step');
    const pausedBallPosition = canvas.getAttribute('data-simulation-ball-position');

    act(() => {
      animationFrames.flush(fixedStepMilliseconds * 2);
    });

    expect(canvas).toHaveAttribute('data-simulation-step', pausedStep);
    expect(canvas).toHaveAttribute('data-simulation-ball-position', pausedBallPosition);

    fireEvent.click(screen.getByRole('button', { name: 'Reprendre' }));
    expect(screen.getByRole('button', { name: 'Mettre en pause' })).toBeVisible();
    act(() => {
      animationFrames.flush(fixedStepMilliseconds * 3);
    });
    act(() => {
      animationFrames.flush(fixedStepMilliseconds * 4);
    });

    expect(Number(canvas.getAttribute('data-simulation-step'))).toBeGreaterThan(Number(pausedStep));
    expect(canvas.getAttribute('data-simulation-ball-position')).not.toBe(pausedBallPosition);
  });

  it('ouvre depuis le menu la liste contenant le seul niveau embarqué et son lancement', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'Ouvrir le menu' }));

    const levelList = screen.getByRole('region', { name: 'Liste des niveaux' });
    expect(levelList).toBeVisible();
    expect(within(levelList).getByText('Niveau 1 · Laisser tomber')).toBeVisible();
    expect(within(levelList).getByRole('button', { name: 'Lancer le niveau 1' })).toBeEnabled();
    expect(within(levelList).queryByText(/Niveau 2/i)).not.toBeInTheDocument();
  });

  it('lance la fixture embarquée en mode joueur et annonce la victoire après des RAF contrôlés', () => {
    const animationFrames = createAnimationFrameHarness();
    render(<App />);

    openEmbeddedLevelOne();

    expect(screen.getByText('Mode joueur')).toBeVisible();
    expect(screen.getByRole('region', { name: 'Objectif du niveau' })).toHaveTextContent(
      'Faire entrer la balle dans le panier',
    );

    fireEvent.click(screen.getByRole('button', { name: 'Tester' }));
    advanceSimulationToResult(animationFrames);

    const result = screen.getByRole('region', { name: 'Résultat du niveau' });
    expect(result).toBeVisible();
    expect(within(result).getByText('Victoire')).toBeVisible();
    expect(within(result).getByRole('button', { name: 'Rejouer le niveau' })).toBeVisible();
    expect(within(result).getByRole('button', { name: 'Retour aux niveaux' })).toBeVisible();
  });

  it('retourne à la liste depuis le résultat sans inventer de niveau suivant', () => {
    const animationFrames = createAnimationFrameHarness();
    render(<App />);

    openEmbeddedLevelOne();
    fireEvent.click(screen.getByRole('button', { name: 'Tester' }));
    advanceSimulationToResult(animationFrames);

    fireEvent.click(screen.getByRole('button', { name: 'Retour aux niveaux' }));

    const levelList = screen.getByRole('region', { name: 'Liste des niveaux' });
    expect(levelList).toBeVisible();
    expect(within(levelList).getByText('Niveau 1 · Laisser tomber')).toBeVisible();
    expect(within(levelList).queryByText(/Niveau 2/i)).not.toBeInTheDocument();
  });

  it('permet de rejouer ou de réinitialiser la simulation sans dialogue bloquant', () => {
    const animationFrames = createAnimationFrameHarness();
    render(<App />);

    openEmbeddedLevelOne();
    fireEvent.click(screen.getByRole('button', { name: 'Tester' }));
    expect(screen.getByText('Simulation en cours')).toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: 'Réinitialiser' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByText('Mode joueur')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Tester' })).toBeEnabled();
    expect(screen.queryByText('Simulation en cours')).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Résultat du niveau' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Tester' }));
    expect(screen.getByText('Simulation en cours')).toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: 'Réinitialiser' }));
    fireEvent.click(screen.getByRole('button', { name: 'Tester' }));
    expect(screen.getByText('Simulation en cours')).toBeVisible();

    advanceSimulationToResult(animationFrames);
    fireEvent.click(screen.getByRole('button', { name: 'Rejouer le niveau' }));
    expect(screen.getByText('Mode joueur')).toBeVisible();
    expect(screen.queryByRole('region', { name: 'Résultat du niveau' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tester' })).toBeEnabled();
  });

  it('identifie explicitement le contexte de travail comme éditeur de niveaux', () => {
    render(<App />);

    expect(screen.getByText('Éditeur de niveaux')).toBeVisible();
    expect(screen.getByText('Mode éditeur')).toBeVisible();
  });

  it('présente le catalogue comme un panneau latéral ouvert en paysage', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: false }));
    vi.stubGlobal('innerWidth', 844);
    vi.stubGlobal('innerHeight', 390);

    render(<App />);

    expect(screen.getByRole('region', { name: 'Objets disponibles' })).not.toHaveClass(
      'object-drawer-collapsed',
    );
    expect(screen.getByRole('button', { name: /Balle/ })).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Fermer le catalogue' })).not.toBeInTheDocument();
  });

  it('active le parcours de placement par toucher d’une carte, séparément du plateau', () => {
    render(<App />);

    const drawer = screen.getByRole('region', { name: 'Objets disponibles' });
    const board = screen.getByRole('region', { name: 'Plateau de jeu' });
    fireEvent.click(screen.getByRole('button', { name: 'Ouvrir le catalogue' }));

    const ballCard = within(drawer).getByRole('button', { name: /Balle/ });
    fireEvent.click(ballCard);

    expect(board).toBeVisible();
    expect(within(board).queryByText(/placement actif.*Balle/i)).not.toBeInTheDocument();
    const cancelButton = screen.getByRole('button', { name: 'Annuler le placement' });
    expect(cancelButton).toBeVisible();
    expect(board).not.toContainElement(cancelButton);
  });

  it('expose les états disponibles d’annuler et de rétablir après un placement', () => {
    render(<App />);

    const undoButton = screen.getByRole('button', { name: 'Annuler' });
    const redoButton = screen.getByRole('button', { name: 'Rétablir' });
    expect(undoButton).toBeDisabled();
    expect(redoButton).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'Ouvrir le catalogue' }));
    fireEvent.click(screen.getByRole('button', { name: /Balle/ }));

    const board = screen.getByRole('region', { name: 'Plateau de jeu' });
    firePointerEvent(board, 'pointerdown', {
      pointerId: 1,
      pointerType: 'touch',
      clientX: 320,
      clientY: 240,
    });
    firePointerEvent(board, 'pointerup', {
      pointerId: 1,
      pointerType: 'touch',
      clientX: 320,
      clientY: 240,
    });

    expect(undoButton).toBeEnabled();
    expect(redoButton).toBeDisabled();

    fireEvent.click(undoButton);
    expect(undoButton).toBeDisabled();
    expect(redoButton).toBeEnabled();

    fireEvent.click(redoButton);
    expect(undoButton).toBeEnabled();
    expect(redoButton).toBeDisabled();
  });

  it('suit le doigt pendant le placement sans créer d’historique avant le relâchement', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'Ouvrir le catalogue' }));
    fireEvent.click(screen.getByRole('button', { name: /Balle/ }));

    const board = screen.getByRole('region', { name: 'Plateau de jeu' });
    const undoButton = screen.getByRole('button', { name: 'Annuler' });
    firePointerEvent(board, 'pointerdown', {
      pointerId: 1,
      pointerType: 'touch',
      clientX: 120,
      clientY: 100,
    });
    firePointerEvent(board, 'pointermove', {
      pointerId: 1,
      pointerType: 'touch',
      clientX: Number.NaN,
      clientY: Number.POSITIVE_INFINITY,
    });

    expect(undoButton).toBeDisabled();
    expect(screen.getByText(/position tactile est indisponible/i)).toBeVisible();

    firePointerEvent(board, 'pointerup', {
      pointerId: 1,
      pointerType: 'touch',
      clientX: Number.NaN,
      clientY: Number.POSITIVE_INFINITY,
    });

    expect(undoButton).toBeDisabled();
  });

  it('place dans l’atelier libre avec le contexte auteur en bordure de la scène', () => {
    // ADR 0007 supprime le document d'atelier en pixels : la scène de
    // l'atelier (16 × 9) déclare désormais une zone de construction qui la
    // couvre entièrement, et tout placement (auteur ou joueur) doit en plus
    // rester contenu dans le rectangle de scène (validation de schéma
    // inconditionnelle). Il n'existe donc plus de position à la fois valide
    // au sens du schéma et hors de la zone de construction : le comportement
    // observable qui reste à garantir est qu'un placement auteur près du
    // bord de la scène/zone de construction est accepté sans refus
    // parasite — la garantie « le contexte auteur ignore la zone de
    // construction » continue d'être couverte au niveau unitaire par
    // src/application/construction/construction-attempt.test.ts.
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'Ouvrir le catalogue' }));
    fireEvent.click(screen.getByRole('button', { name: /Balle/ }));

    const board = screen.getByRole('region', { name: 'Plateau de jeu' });
    // Avec le canvas simulé 800 × 450 et la scène 16 × 9 de l'atelier, ce
    // point correspond à un point monde proche du coin (16, 9) de la scène,
    // donc de la zone de construction — mais toujours strictement à
    // l'intérieur des deux.
    firePointerEvent(board, 'pointerdown', {
      pointerId: 1,
      pointerType: 'touch',
      clientX: 700,
      clientY: 380,
    });
    firePointerEvent(board, 'pointerup', {
      pointerId: 1,
      pointerType: 'touch',
      clientX: 700,
      clientY: 380,
    });

    expect(screen.queryByText(/placement refusé/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Annuler' })).toBeEnabled();
    expect(screen.queryByRole('button', { name: 'Annuler le placement' })).not.toBeInTheDocument();
  });

  it('ferme réellement le tiroir après activation tout en gardant le placement annulable', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'Ouvrir le catalogue' }));
    fireEvent.click(screen.getByRole('button', { name: /Balle/ }));

    const drawer = screen.getByRole('region', { name: 'Objets disponibles' });
    expect(drawer).toBeVisible();
    expect(drawer).toHaveClass('object-drawer-collapsed');
    expect(screen.getByRole('button', { name: 'Ouvrir le catalogue' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    expect(screen.queryByRole('button', { name: /Balle/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Fermer le catalogue' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Annuler le placement' })).toBeVisible();
  });

  it('définit la conversion d’un point viewport en unités monde avec un plateau décalé et un zoom', () => {
    expect(screenPointToWorld({ x: 250, y: 170 }, { left: 100, top: 50 }, 2)).toEqual({
      x: 75,
      y: 60,
    });
  });

  it('convertit le toucher depuis le rectangle du canvas et non celui du cadre à bordure de 2 px', () => {
    // styles.css place le canvas en `inset: 0` à l'intérieur de `.scene-frame`,
    // qui porte une bordure de 2 px : les deux rectangles sont donc décalés
    // l'un par rapport à l'autre dans un vrai navigateur. jsdom ne fait
    // aucune mise en page, donc ce décalage doit être simulé explicitement
    // pour vérifier que la conversion part bien du canvas.
    render(<App />);

    const board = screen.getByRole('region', { name: 'Plateau de jeu' });
    const canvas = within(board).getByRole('img', { name: 'Rendu du plateau' });

    vi.spyOn(board, 'getBoundingClientRect').mockReturnValue({
      x: 0,
      y: 0,
      left: 0,
      top: 0,
      right: BOARD_CANVAS_WIDTH_IN_CSS_PIXELS + 4,
      bottom: BOARD_CANVAS_HEIGHT_IN_CSS_PIXELS + 4,
      width: BOARD_CANVAS_WIDTH_IN_CSS_PIXELS + 4,
      height: BOARD_CANVAS_HEIGHT_IN_CSS_PIXELS + 4,
      toJSON() {
        return this;
      },
    });
    vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({
      x: 2,
      y: 2,
      left: 2,
      top: 2,
      right: BOARD_CANVAS_WIDTH_IN_CSS_PIXELS + 2,
      bottom: BOARD_CANVAS_HEIGHT_IN_CSS_PIXELS + 2,
      width: BOARD_CANVAS_WIDTH_IN_CSS_PIXELS,
      height: BOARD_CANVAS_HEIGHT_IN_CSS_PIXELS,
      toJSON() {
        return this;
      },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Ouvrir le catalogue' }));
    fireEvent.click(screen.getByRole('button', { name: /Balle/ }));

    firePointerEvent(board, 'pointerdown', {
      pointerId: 1,
      pointerType: 'touch',
      clientX: 702,
      clientY: 382,
    });
    firePointerEvent(board, 'pointerup', {
      pointerId: 1,
      pointerType: 'touch',
      clientX: 702,
      clientY: 382,
    });

    const scene = screen.getByRole('region', { name: 'Objets de la scène' });
    const placedBall = within(scene).getByRole('button', { name: 'Balle' });
    const [placedX, placedY] = (placedBall.getAttribute('data-position') ?? '')
      .split(',')
      .map(Number);

    // Attendu à partir du rectangle du CANVAS (left/top = 2) : si la
    // conversion utilisait par erreur le rectangle du cadre (left/top = 0),
    // le résultat serait décalé de 2 / 48 ≈ 0,0417 unité monde sur chaque
    // axe — l'écart exact que ce test doit détecter.
    expect(placedX).toBeCloseTo(14.25, 6);
    expect(placedY).toBeCloseTo(7.729166666666667, 6);
  });

  it('annule une prévisualisation sur pointercancel sans projection ni entrée d’historique', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'Ouvrir le catalogue' }));
    fireEvent.click(screen.getByRole('button', { name: /Balle/ }));

    const board = screen.getByRole('region', { name: 'Plateau de jeu' });
    const undoButton = screen.getByRole('button', { name: 'Annuler' });
    firePointerEvent(board, 'pointerdown', {
      pointerId: 1,
      pointerType: 'touch',
      clientX: 120,
      clientY: 100,
    });
    firePointerEvent(board, 'pointercancel', {
      pointerId: 1,
      pointerType: 'touch',
      clientX: 120,
      clientY: 100,
    });

    expect(undoButton).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Annuler le placement' })).toBeVisible();

    firePointerEvent(board, 'pointerup', {
      pointerId: 1,
      pointerType: 'touch',
      clientX: 120,
      clientY: 100,
    });
    expect(undoButton).toBeDisabled();
  });

  it('annule le placement lorsqu’un second pointeur arrive sans créer de commande', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'Ouvrir le catalogue' }));
    fireEvent.click(screen.getByRole('button', { name: /Balle/ }));

    const board = screen.getByRole('region', { name: 'Plateau de jeu' });
    const undoButton = screen.getByRole('button', { name: 'Annuler' });
    firePointerEvent(board, 'pointerdown', {
      pointerId: 1,
      pointerType: 'touch',
      clientX: 120,
      clientY: 100,
    });
    firePointerEvent(board, 'pointerdown', {
      pointerId: 2,
      pointerType: 'touch',
      clientX: 180,
      clientY: 140,
    });
    firePointerEvent(board, 'pointerup', {
      pointerId: 2,
      pointerType: 'touch',
      clientX: 180,
      clientY: 140,
    });

    expect(undoButton).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Annuler le placement' })).toBeVisible();
  });

  it('refuse des coordonnées absentes avant prévisualisation ou commit et conserve l’outil annulable', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'Ouvrir le catalogue' }));
    fireEvent.click(screen.getByRole('button', { name: /Balle/ }));

    const board = screen.getByRole('region', { name: 'Plateau de jeu' });
    const undoButton = screen.getByRole('button', { name: 'Annuler' });
    const pointerDown = new Event('pointerdown', { bubbles: true });
    fireEvent(board, pointerDown);

    const feedback = screen.getByText(/position tactile est indisponible/i);
    expect(feedback).toBeVisible();
    expect(feedback).toHaveAttribute('aria-live', 'assertive');
    expect(screen.getByRole('button', { name: 'Annuler le placement' })).toBeEnabled();
    expect(undoButton).toBeDisabled();

    fireEvent(board, new Event('pointerup', { bubbles: true }));
    expect(undoButton).toBeDisabled();
  });

  it('refuse les coordonnées non finies avant prévisualisation ou commit', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'Ouvrir le catalogue' }));
    fireEvent.click(screen.getByRole('button', { name: /Balle/ }));

    const board = screen.getByRole('region', { name: 'Plateau de jeu' });
    const undoButton = screen.getByRole('button', { name: 'Annuler' });
    const pointerDown = new Event('pointerdown', { bubbles: true });
    Object.defineProperties(pointerDown, {
      clientX: { configurable: true, value: Number.NaN },
      clientY: { configurable: true, value: Number.POSITIVE_INFINITY },
    });
    fireEvent(board, pointerDown);

    const feedback = screen.getByText(/position tactile est indisponible/i);
    expect(feedback).toBeVisible();
    expect(feedback).toHaveAttribute('aria-live', 'assertive');
    expect(screen.getByRole('button', { name: 'Annuler le placement' })).toBeEnabled();
    expect(undoButton).toBeDisabled();
  });

  it('réserve une cible tactile de 44 CSS px pour l’annulation du placement', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'Ouvrir le catalogue' }));
    fireEvent.click(screen.getByRole('button', { name: /Balle/ }));

    const cancelButton = screen.getByRole('button', { name: 'Annuler le placement' });
    expect(cancelButton).toHaveClass('placement-cancel');
    expect(styles).toMatch(/\.placement-cancel\s*\{[^}]*min-width:\s*44px[^}]*min-height:\s*44px/s);
  });

  it('pilote le cadrage avec les boutons tactiles, le borne aux nouvelles limites, et restaure la scène', () => {
    // Remplace l'ancien test du même nom, qui ne détectait plus rien : avec
    // l'amorce (fitCameraToScene bornée à un canvas de taille nulle sous
    // jsdom), « Ajuster à la scène » ne recalculait rien et l'assertion
    // finale passait par coïncidence sur la dernière valeur de zoom laissée
    // par les clics précédents. Ce test vérifie désormais que les boutons
    // changent réellement le zoom, que les bornes de l'ADR 0007 § Caméra
    // s'appliquent ([0,6×, 4×] le zoom ajusté), et que « Ajuster à la scène »
    // recalcule bien un cadrage identique au cadrage initial.
    render(<App />);

    const canvas = within(screen.getByRole('region', { name: 'Plateau de jeu' })).getByRole('img', {
      name: 'Rendu du plateau',
    });
    const readZoom = (): number => {
      const value = canvas.getAttribute('data-camera-zoom');
      if (value === null) throw new Error('Le canvas doit exposer le zoom courant.');
      return Number(value);
    };

    // Avec le canvas simulé 800 × 450 (16 × 9, comme la scène de l'atelier)
    // et la marge de 4 % de l'ADR 0007, le cadrage initial vaut 48 px/unité ;
    // les bornes de zoom valent donc [0,6 × 48, 4 × 48] = [28,8, 192].
    const initialZoom = readZoom();
    expect(initialZoom).toBe(48);
    const expectedMinZoom = 28.8;
    const expectedMaxZoom = 192;

    fireEvent.click(screen.getByRole('button', { name: 'Zoom avant' }));
    expect(readZoom()).toBeGreaterThan(initialZoom);

    for (let clicks = 0; clicks < 20; clicks += 1) {
      fireEvent.click(screen.getByRole('button', { name: 'Zoom avant' }));
    }
    expect(readZoom()).toBeCloseTo(expectedMaxZoom, 6);

    for (let clicks = 0; clicks < 30; clicks += 1) {
      fireEvent.click(screen.getByRole('button', { name: 'Zoom arrière' }));
    }
    expect(readZoom()).toBeCloseTo(expectedMinZoom, 6);

    fireEvent.click(screen.getByRole('button', { name: 'Ajuster à la scène' }));
    expect(readZoom()).toBe(initialZoom);
  });

  it('sélectionne une poutre hors canvas et regroupe son déplacement tactile en une commande', () => {
    render(<App />);
    placeBeam();

    const scene = screen.getByRole('region', { name: 'Objets de la scène' });
    const beam = within(scene).getByRole('button', { name: 'Poutre' });
    const initialPosition = beam.getAttribute('data-position');
    if (initialPosition === null) throw new Error('La poutre doit exposer sa position initiale.');

    fireEvent.click(beam);
    expect(beam).toHaveAttribute('aria-pressed', 'true');

    const contextPanel = screen.getByRole('region', { name: 'Objet sélectionné : Poutre' });
    const moveControl = within(contextPanel).getByRole('button', {
      name: 'Déplacer la poutre',
    });

    firePointerEvent(moveControl, 'pointerdown', {
      pointerId: 2,
      pointerType: 'touch',
      clientX: 320,
      clientY: 240,
    });
    firePointerEvent(moveControl, 'pointermove', {
      pointerId: 2,
      pointerType: 'touch',
      clientX: 360,
      clientY: 260,
    });
    firePointerEvent(moveControl, 'pointermove', {
      pointerId: 2,
      pointerType: 'touch',
      clientX: 420,
      clientY: 300,
    });
    firePointerEvent(moveControl, 'pointerup', {
      pointerId: 2,
      pointerType: 'touch',
      clientX: 420,
      clientY: 300,
    });

    const movedPosition = beam.getAttribute('data-position');
    if (movedPosition === null) throw new Error('La poutre doit exposer sa position déplacée.');
    expect(movedPosition).not.toBe(initialPosition);

    const undoButton = screen.getByRole('button', { name: 'Annuler' });
    const redoButton = screen.getByRole('button', { name: 'Rétablir' });
    fireEvent.click(undoButton);
    expect(within(scene).getByRole('button', { name: 'Poutre' })).toHaveAttribute(
      'data-position',
      initialPosition,
    );
    expect(redoButton).toBeEnabled();

    fireEvent.click(redoButton);
    expect(within(scene).getByRole('button', { name: 'Poutre' })).toHaveAttribute(
      'data-position',
      movedPosition,
    );
  });

  it('fait pivoter puis supprime la poutre avec des contrôles accessibles et undo/redo', () => {
    render(<App />);
    placeBeam();

    const scene = screen.getByRole('region', { name: 'Objets de la scène' });
    const beam = within(scene).getByRole('button', { name: 'Poutre' });
    fireEvent.click(beam);

    const contextPanel = screen.getByRole('region', { name: 'Objet sélectionné : Poutre' });
    const initialRotation = beam.getAttribute('data-rotation');
    const rotateControl = within(contextPanel).getByRole('button', {
      name: 'Tourner à droite',
    });
    expect(styles).toMatch(/\.context-action\s*\{[^}]*min-width:\s*44px[^}]*min-height:\s*44px/s);

    fireEvent.click(rotateControl);
    expect(beam.getAttribute('data-rotation')).not.toBe(initialRotation);

    fireEvent.click(within(contextPanel).getByRole('button', { name: 'Supprimer la poutre' }));
    expect(within(scene).queryByRole('button', { name: 'Poutre' })).not.toBeInTheDocument();

    const undoButton = screen.getByRole('button', { name: 'Annuler' });
    const redoButton = screen.getByRole('button', { name: 'Rétablir' });
    fireEvent.click(undoButton);
    const restoredBeam = within(scene).getByRole('button', { name: 'Poutre' });
    expect(restoredBeam).toHaveAttribute('data-rotation');
    expect(restoredBeam.getAttribute('data-rotation')).not.toBe(initialRotation);

    fireEvent.click(redoButton);
    expect(within(scene).queryByRole('button', { name: 'Poutre' })).not.toBeInTheDocument();
  });
});

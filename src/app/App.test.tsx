// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

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

describe('coque Contrapt!', () => {
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

  it('place dans l’atelier libre avec le contexte auteur hors de la zone joueur', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'Ouvrir le catalogue' }));
    fireEvent.click(screen.getByRole('button', { name: /Balle/ }));

    const board = screen.getByRole('region', { name: 'Plateau de jeu' });
    firePointerEvent(board, 'pointerdown', {
      pointerId: 1,
      pointerType: 'touch',
      clientX: -1000,
      clientY: -1000,
    });
    firePointerEvent(board, 'pointerup', {
      pointerId: 1,
      pointerType: 'touch',
      clientX: -1000,
      clientY: -1000,
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
});

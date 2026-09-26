// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { embeddedLevels } from '../content/embedded-levels';
import { fitCameraToScene } from '../presentation/board-camera';
import { ROTATION_HANDLE_DISTANCE_CSS_PIXELS } from '../presentation/board-renderer';
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

const openEmbeddedLevelOne = (): void => {
  fireEvent.click(screen.getByRole('button', { name: 'Ouvrir le menu' }));
  fireEvent.click(screen.getByRole('button', { name: 'Liste des niveaux' }));
  fireEvent.click(screen.getByRole('button', { name: 'Lancer le niveau 1' }));
};

const tapWorldPoint = (x: number, y: number): void => {
  const board = screen.getByRole('region', { name: 'Plateau de jeu' });
  const canvas = within(board).getByRole('img', { name: 'Rendu du plateau' });
  const rawOrigin = canvas.getAttribute('data-camera-origin');
  if (rawOrigin === null) throw new Error('Origine caméra absente du canvas.');
  const [originX, originY] = rawOrigin.split(',').map(Number);
  const zoom = Number(canvas.getAttribute('data-camera-zoom'));
  if (originX === undefined || originY === undefined || !Number.isFinite(zoom) || zoom <= 0) {
    throw new Error('Cadrage caméra invalide dans le test.');
  }

  const canvasBounds = canvas.getBoundingClientRect();
  tapBoard(
    board,
    canvasBounds.left + (x - originX) * zoom,
    canvasBounds.top + (y - originY) * zoom,
  );
};

const placeCampaignBeam = (x: number, y: number): void => {
  fireEvent.click(screen.getByRole('button', { name: 'Ouvrir le catalogue' }));
  fireEvent.click(screen.getByRole('button', { name: 'Poutre moyenne' }));
  tapWorldPoint(x, y);
};

/** B5: the declared scene of the level the app boots into, for cross-checking `fitCameraToScene`. */
const levelOneScene = (() => {
  const levelOne = embeddedLevels[0];
  if (levelOne === undefined)
    throw new Error('Le niveau 1 embarqué est indisponible dans les tests.');
  return levelOne.scene;
})();

/**
 * B1 (plan-remise-en-jeu.md § 4) moved the free-creation workshop off the
 * home screen: it is reachable only through ☰ → « Atelier de construction ».
 * Every test below that exercises editor/catalogue behaviour starts here.
 */
const openEmbeddedWorkshop = (): void => {
  fireEvent.click(screen.getByRole('button', { name: 'Ouvrir le menu' }));
  fireEvent.click(screen.getByRole('button', { name: 'Atelier de construction' }));
};

const tapBoard = (board: HTMLElement, clientX: number, clientY: number): void => {
  firePointerEvent(board, 'pointerdown', { pointerId: 1, pointerType: 'touch', clientX, clientY });
  firePointerEvent(board, 'pointerup', { pointerId: 1, pointerType: 'touch', clientX, clientY });
};

/** Places an object from the open workshop's catalogue with a tap at (x, y). */
const placeFromCatalogue = (catalogueCard: string, clientX = 400, clientY = 225): HTMLElement => {
  const toggle = screen.queryByRole('button', { name: 'Ouvrir le catalogue' });
  if (toggle !== null) fireEvent.click(toggle);
  fireEvent.click(screen.getByRole('button', { name: catalogueCard }));

  const board = screen.getByRole('region', { name: 'Plateau de jeu' });
  tapBoard(board, clientX, clientY);
  return board;
};

const placeWorkshopObject = (catalogueCard: string): HTMLElement => {
  openEmbeddedWorkshop();
  return placeFromCatalogue(catalogueCard);
};

const placeWorkshopBeam = (): HTMLElement => placeWorkshopObject('Poutre moyenne');

const advanceSimulationToResult = (
  animationFrames: ReturnType<typeof createAnimationFrameHarness>,
  frameCount = 180,
): void => {
  const fixedStepMilliseconds = 1000 / 60;

  act(() => {
    animationFrames.flush(0);
    for (let frame = 1; frame <= frameCount; frame += 1) {
      animationFrames.flush(frame * fixedStepMilliseconds);
    }
  });
};

/**
 * B2 (plan-remise-en-jeu.md § 4) : le budget d'une tentative vaut vingt
 * secondes simulées, soit 1200 pas fixes à 60 Hz, et le plafond de rattrapage
 * n'accorde que cinq pas par frame. Il faut donc 240 frames suffisamment
 * espacées pour atteindre le temps écoulé. Les frames suivantes sont sans
 * effet : la boucle cesse de se replanifier dès l'issue connue.
 */
const advanceSimulationToTimeout = (
  animationFrames: ReturnType<typeof createAnimationFrameHarness>,
): void => {
  act(() => {
    animationFrames.flush(0);
    for (let frame = 1; frame <= 240; frame += 1) {
      animationFrames.flush(frame * 1000);
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
    // `BrowserRouter` (ADR 0008) reads the real `window.location`, which
    // jsdom keeps across tests in this file — without this reset, a test
    // that navigates away (e.g. `openEmbeddedWorkshop`) leaks its route into
    // whichever test renders `<App />` next.
    window.history.replaceState(null, '', '/');
    vi.spyOn(HTMLCanvasElement.prototype, 'getBoundingClientRect').mockReturnValue(boardCanvasRect);
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('ouvre l’objectif dans une boîte de dialogue modale et rend le focus en la fermant', () => {
    render(<App />);

    const trigger = screen.getByRole('button', { name: 'Voir l’objectif' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    trigger.focus();
    fireEvent.click(trigger);

    const dialog = screen.getByRole('dialog', { name: 'Objectif du niveau' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveTextContent('Faire entrer la balle dans le panier');
    const close = within(dialog).getByRole('button', { name: 'Fermer l’objectif' });
    expect(close).toHaveFocus();

    // Tab reste dans la boîte de dialogue.
    fireEvent.keyDown(close, { key: 'Tab' });
    expect(close).toHaveFocus();

    fireEvent.click(close);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('ferme la boîte de dialogue de l’objectif par Échap ou par un toucher sur le fond', () => {
    const { container } = render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'Voir l’objectif' }));
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Voir l’objectif' }));
    const backdrop = container.ownerDocument.querySelector('.dialog-scrim');
    expect(backdrop).not.toBeNull();
    if (backdrop !== null) fireEvent.click(backdrop);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('démarre en mode résolution sur le niveau 1, avec sa poutre et sans édition libre', () => {
    // B1 (plan-remise-en-jeu.md § 4) : l'application n'ouvre plus l'atelier
    // par défaut ; elle charge directement le niveau 1 embarqué en session
    // de résolution. L’inventaire fournit sa poutre, sans ouvrir les
    // commandes d’édition libre.
    render(<App />);

    expect(screen.getByRole('heading', { name: 'Contrapt!' })).toBeVisible();
    expect(screen.getByText('Niveau 1 · Prolonger la pente')).toBeVisible();
    expect(screen.getByText('Mode joueur')).toBeVisible();
    expect(screen.getByRole('region', { name: 'Plateau de jeu' })).toBeVisible();
    // L'objectif n'occupe plus d'espace permanent : il est accessible par un
    // bouton explicite (`mobile-editor-interactions.md` § Organisation de
    // l'écran : « un accès à l'objectif »).
    expect(screen.queryByText('Faire entrer la balle dans le panier')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Voir l’objectif' })).toBeVisible();

    expect(screen.getByRole('region', { name: 'Objets disponibles' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Ouvrir le catalogue' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Annuler' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Rétablir' })).toBeDisabled();

    for (const actionName of ['Tester', 'Zoom arrière', 'Ajuster à la scène', 'Zoom avant']) {
      expect(screen.getByRole('button', { name: actionName })).toBeVisible();
    }
  });

  it('ouvre l’atelier depuis le menu et expose le plateau et les familles du catalogue', () => {
    // Réécrit depuis « présente le plateau et les quatre familles du
    // catalogue » : ce test décrivait l'atelier comme écran d'accueil, un
    // comportement que B1 supprime explicitement. L'atelier reste
    // entièrement fonctionnel, mais désormais uniquement depuis ☰.
    render(<App />);
    openEmbeddedWorkshop();

    expect(screen.getByText('Éditeur de niveaux')).toBeVisible();
    expect(screen.getByText('Mode éditeur')).toBeVisible();
    expect(screen.getByRole('region', { name: 'Plateau de jeu' })).toBeVisible();
    expect(screen.getByRole('region', { name: 'Objets disponibles' })).toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: 'Ouvrir le catalogue' }));

    expect(screen.getByRole('button', { name: /Balle/ })).toBeVisible();
    expect(screen.getByRole('button', { name: /Panier/ })).toBeVisible();
    expect(screen.getByRole('button', { name: /Poutre/ })).toBeVisible();
    expect(screen.getByRole('button', { name: /Bascule/ })).toBeVisible();
    expect(screen.getByRole('button', { name: /Masse/ })).toBeVisible();
    expect(screen.getByRole('button', { name: /Levier/ })).toBeVisible();
    expect(screen.getByRole('button', { name: /Convoyeur/ })).toBeVisible();
    expect(screen.getByRole('button', { name: /Bouton/ })).toBeVisible();
    expect(screen.getByRole('button', { name: /Ventilateur/ })).toBeVisible();
    expect(screen.getByRole('button', { name: /Barrière/ })).toBeVisible();
    expect(screen.getByRole('button', { name: /Tremplin/ })).toBeVisible();
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
    openEmbeddedWorkshop();

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
    openEmbeddedWorkshop();

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
    openEmbeddedWorkshop();

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
    openEmbeddedWorkshop();

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
    openEmbeddedWorkshop();

    const workspace = screen.getByRole('region', { name: 'Espace de construction' });
    const boundsBefore = workspace.getBoundingClientRect();

    fireEvent.click(screen.getByRole('button', { name: 'Ouvrir le catalogue' }));

    expect(workspace.getBoundingClientRect()).toEqual(boundsBefore);
  });

  it('laisse les actions essentielles visibles lorsque le tiroir est replié', () => {
    render(<App />);
    openEmbeddedWorkshop();

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
    openEmbeddedWorkshop();

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

  it('plafonne le rattrapage RAF à 5 pas fixes après un long écart entre deux frames', () => {
    // Un retour d'onglet suspend requestAnimationFrame ; l'écart entre deux
    // frames peut alors valoir plusieurs secondes. Sans plafond, la boucle
    // tenterait des centaines de pas fixes d'un coup (5000 ms / (1000/60 ms)
    // = 300 pas) et gèlerait la page. Le plafond limite le rattrapage à 5 pas
    // fixes par frame ; le reste de la durée accumulée est abandonné.
    const animationFrames = createAnimationFrameHarness();
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'Tester' }));

    const board = screen.getByRole('region', { name: 'Plateau de jeu' });
    const canvas = within(board).getByRole('img', { name: 'Rendu du plateau' });
    expect(canvas).toHaveAttribute('data-simulation-step', '0');

    act(() => {
      animationFrames.flush(0);
    });
    act(() => {
      animationFrames.flush(5000);
    });

    expect(canvas).toHaveAttribute('data-simulation-step', '5');
  });

  it('ouvre depuis le menu la liste contenant le seul niveau embarqué et son lancement', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'Ouvrir le menu' }));
    fireEvent.click(screen.getByRole('button', { name: 'Liste des niveaux' }));

    const levelList = screen.getByRole('region', { name: 'Liste des niveaux' });
    expect(levelList).toBeVisible();
    expect(within(levelList).getByText('Niveau 1 · Prolonger la pente')).toBeVisible();
    expect(within(levelList).getByRole('button', { name: 'Lancer le niveau 1' })).toBeEnabled();
    expect(within(levelList).queryByText(/Niveau 2/i)).not.toBeInTheDocument();
  });

  it('navigue vers une page de réglages dédiée depuis le menu (ADR 0008)', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'Ouvrir le menu' }));
    fireEvent.click(screen.getByRole('button', { name: 'Paramètres' }));

    expect(window.location.pathname).toBe('/settings');
    expect(screen.getByRole('region', { name: 'Paramètres' })).toBeVisible();
    expect(screen.queryByRole('region', { name: 'Plateau de jeu' })).not.toBeInTheDocument();
  });

  it('adresse chaque écran par sa propre URL et ouvre directement dessus au chargement (ADR 0008)', () => {
    window.history.replaceState(null, '', '/editor');
    render(<App />);

    expect(screen.getByText('Éditeur de niveaux')).toBeVisible();
    expect(screen.getByText('Mode éditeur')).toBeVisible();
  });

  it('ouvre la démonstration sur /demo, en mode joueur sans rien à construire', () => {
    window.history.replaceState(null, '', '/demo');
    render(<App />);

    expect(screen.getByText('Démonstration')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Tester' })).toBeVisible();
    expect(screen.queryByRole('region', { name: 'Objets disponibles' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Ouvrir le menu' }));
    fireEvent.click(screen.getByRole('button', { name: 'Liste des niveaux' }));
    fireEvent.click(screen.getByRole('button', { name: 'Ouvrir le menu' }));
    fireEvent.click(screen.getByRole('button', { name: 'Démonstration' }));
    expect(window.location.pathname).toBe('/demo');
  });

  it('redirige une route inconnue vers la liste des niveaux (ADR 0008)', () => {
    window.history.replaceState(null, '', '/une-route-qui-nexiste-pas');
    render(<App />);

    expect(window.location.pathname).toBe('/levels');
    expect(screen.getByRole('region', { name: 'Liste des niveaux' })).toBeVisible();
  });

  it('annonce l’échec sans action puis la victoire après la poutre de référence', () => {
    const animationFrames = createAnimationFrameHarness();
    render(<App />);

    openEmbeddedLevelOne();
    expect(screen.getByText('Mode joueur')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Voir l’objectif' }));
    expect(screen.getByRole('dialog', { name: 'Objectif du niveau' })).toHaveTextContent(
      'Faire entrer la balle dans le panier',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Fermer l’objectif' }));

    fireEvent.click(screen.getByRole('button', { name: 'Tester' }));
    advanceSimulationToResult(animationFrames, 360);

    const failedResult = screen.getByRole('region', { name: 'Résultat du niveau' });
    expect(within(failedResult).getByText('Échec')).toBeVisible();
    expect(within(failedResult).queryByText('Victoire')).not.toBeInTheDocument();
    fireEvent.click(within(failedResult).getByRole('button', { name: 'Réinitialiser' }));

    placeCampaignBeam(5.0, 2.15);
    fireEvent.click(screen.getByRole('button', { name: 'Tester' }));
    advanceSimulationToResult(animationFrames, 360);

    const result = screen.getByRole('region', { name: 'Résultat du niveau' });
    expect(within(result).getByText('Victoire')).toBeVisible();
    expect(within(result).getByRole('button', { name: 'Rejouer le niveau' })).toBeVisible();
    expect(within(result).getByRole('button', { name: 'Retour aux niveaux' })).toBeVisible();
  });

  it('affiche le bandeau de victoire après le plateau dans le flux normal, jamais en overlay', () => {
    window.history.replaceState(null, '', '/demo');
    // B1 (plan-remise-en-jeu.md § 4) : le bandeau de victoire recouvrait le
    // bas du plateau (position absolue par-dessus le canvas), ce qui pouvait
    // cacher la balle et le panier. Il s'affiche désormais après le plateau
    // dans le DOM, dans le flux normal du document.
    const animationFrames = createAnimationFrameHarness();
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'Tester' }));
    advanceSimulationToResult(animationFrames, 600);

    const board = screen.getByRole('region', { name: 'Plateau de jeu' });
    const result = screen.getByRole('region', { name: 'Résultat du niveau' });

    expect(board.compareDocumentPosition(result) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(styles).not.toMatch(/\.level-result\s*\{[^}]*position:\s*absolute/s);
  });

  it('annonce l’échec sans recouvrir le plateau quand le temps de la tentative est écoulé', () => {
    // B2 (plan-remise-en-jeu.md § 4) : la balle de l'atelier se pose sur la
    // poutre du sol et n'atteindra jamais le panier. Sans issue d'échec, la
    // tentative ne se terminait pas.
    const animationFrames = createAnimationFrameHarness();
    render(<App />);

    openEmbeddedWorkshop();
    fireEvent.click(screen.getByRole('button', { name: 'Tester' }));
    advanceSimulationToTimeout(animationFrames);

    const board = screen.getByRole('region', { name: 'Plateau de jeu' });
    const result = screen.getByRole('region', { name: 'Résultat du niveau' });

    expect(within(result).getByText('Échec')).toBeVisible();
    expect(within(result).queryByText('Victoire')).not.toBeInTheDocument();
    expect(within(result).getByText(/temps écoulé/i)).toBeVisible();
    expect(within(result).getByRole('button', { name: 'Réinitialiser' })).toBeVisible();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(board.compareDocumentPosition(result) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('réinitialise depuis le bandeau d’échec et restitue le document d’avant lancement', () => {
    const animationFrames = createAnimationFrameHarness();
    render(<App />);

    openEmbeddedWorkshop();
    const board = screen.getByRole('region', { name: 'Plateau de jeu' });
    const canvas = within(board).getByRole('img', { name: 'Rendu du plateau' });

    fireEvent.click(screen.getByRole('button', { name: 'Tester' }));
    const ballPositionAtLaunch = canvas.getAttribute('data-simulation-ball-position');
    expect(ballPositionAtLaunch).not.toBeNull();

    advanceSimulationToTimeout(animationFrames);
    expect(canvas.getAttribute('data-simulation-ball-position')).not.toBe(ballPositionAtLaunch);

    const result = screen.getByRole('region', { name: 'Résultat du niveau' });
    fireEvent.click(within(result).getByRole('button', { name: 'Réinitialiser' }));

    expect(screen.queryByRole('region', { name: 'Résultat du niveau' })).not.toBeInTheDocument();
    expect(canvas).not.toHaveAttribute('data-simulation-step');
    expect(screen.getByRole('button', { name: 'Tester' })).toBeEnabled();

    // Relancer depuis le document restitué repart exactement du même état.
    fireEvent.click(screen.getByRole('button', { name: 'Tester' }));
    expect(canvas.getAttribute('data-simulation-ball-position')).toBe(ballPositionAtLaunch);
  });

  it('retourne à la liste depuis le résultat sans inventer de niveau suivant', () => {
    const animationFrames = createAnimationFrameHarness();
    render(<App />);

    openEmbeddedLevelOne();
    fireEvent.click(screen.getByRole('button', { name: 'Tester' }));
    advanceSimulationToTimeout(animationFrames);

    fireEvent.click(screen.getByRole('button', { name: 'Retour aux niveaux' }));

    const levelList = screen.getByRole('region', { name: 'Liste des niveaux' });
    expect(levelList).toBeVisible();
    expect(within(levelList).getByText('Niveau 1 · Prolonger la pente')).toBeVisible();
    expect(within(levelList).queryByText(/Niveau 2/i)).not.toBeInTheDocument();
  });

  it('permet de rejouer ou de réinitialiser la simulation sans dialogue bloquant', () => {
    const animationFrames = createAnimationFrameHarness();
    render(<App />);

    placeCampaignBeam(5.0, 2.15);
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

    advanceSimulationToResult(animationFrames, 320);
    fireEvent.click(screen.getByRole('button', { name: 'Rejouer le niveau' }));
    expect(screen.getByText('Mode joueur')).toBeVisible();
    expect(screen.queryByRole('region', { name: 'Résultat du niveau' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tester' })).toBeEnabled();
  });

  it('identifie l’atelier, une fois ouvert depuis le menu, comme éditeur de niveaux', () => {
    // Réécrit depuis « identifie explicitement le contexte de travail comme
    // éditeur de niveaux », qui vérifiait ces libellés dès le premier rendu :
    // B1 fait démarrer l'application sur le niveau 1, pas sur l'atelier.
    render(<App />);
    openEmbeddedWorkshop();

    expect(screen.getByText('Éditeur de niveaux')).toBeVisible();
    expect(screen.getByText('Mode éditeur')).toBeVisible();
  });

  it('présente le catalogue comme un panneau latéral ouvert sur une tablette ou un poste de bureau en paysage', () => {
    // Réécrit depuis « … ouvert en paysage », qui stubbait 844 × 390 (un
    // téléphone en paysage) : D4 (plan-remise-en-jeu.md § 6, écart constaté)
    // a resserré `use-side-layout.ts` pour exiger aussi une hauteur réelle
    // (`innerHeight >= 480`), pas seulement la largeur et l'orientation — un
    // essai en navigateur réel à 844 × 390 a montré la mise en page à trois
    // colonnes (catalogue + plateau + panneau) trop à l'étroit : la barre
    // d'actions se repliait sur trois lignes et le plateau devenait minuscule.
    // Un téléphone en paysage garde donc le tiroir en bas ; ce test vérifie
    // désormais le format qui a réellement la place pour un panneau latéral.
    vi.stubGlobal('matchMedia', () => ({ matches: false }));
    vi.stubGlobal('innerWidth', 1180);
    vi.stubGlobal('innerHeight', 820);

    render(<App />);
    openEmbeddedWorkshop();

    expect(screen.getByRole('region', { name: 'Objets disponibles' })).not.toHaveClass(
      'object-drawer-collapsed',
    );
    expect(screen.getByRole('button', { name: /Balle/ })).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Fermer le catalogue' })).not.toBeInTheDocument();
  });

  it('garde le catalogue en tiroir repliable sur un téléphone en paysage, trop court pour un panneau latéral', () => {
    // Nouveau test compagnon du précédent (D4, plan-remise-en-jeu.md § 6) :
    // verrouille explicitement le cas qui a motivé le resserrement du seuil,
    // pour qu'il ne régresse pas silencieusement si le seuil bouge à nouveau.
    vi.stubGlobal('matchMedia', () => ({ matches: false }));
    vi.stubGlobal('innerWidth', 844);
    vi.stubGlobal('innerHeight', 390);

    render(<App />);
    openEmbeddedWorkshop();

    expect(screen.getByRole('region', { name: 'Objets disponibles' })).toHaveClass(
      'object-drawer-collapsed',
    );
    expect(screen.getByRole('button', { name: 'Ouvrir le catalogue' })).toBeVisible();
  });

  it('active le parcours de placement par toucher d’une carte, séparément du plateau', () => {
    render(<App />);
    openEmbeddedWorkshop();

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
    openEmbeddedWorkshop();

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
    openEmbeddedWorkshop();

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
    openEmbeddedWorkshop();

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
    openEmbeddedWorkshop();

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
    openEmbeddedWorkshop();

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
    openEmbeddedWorkshop();

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
    openEmbeddedWorkshop();

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
    openEmbeddedWorkshop();

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
    openEmbeddedWorkshop();

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
    // recalcule bien un cadrage identique au cadrage initial. Il s'exécute
    // dans l'atelier (scène 16 × 9) : les valeurs attendues en dépendent.
    render(<App />);
    openEmbeddedWorkshop();

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

  it('réajuste la caméra quand le canvas lui-même change de taille, pas seulement la fenêtre', () => {
    // Bug trouvé pendant le passage manuel de B1 : mettre le bandeau de
    // victoire dans le flux normal (plutôt qu'en overlay) réduit la hauteur
    // de `.scene-frame` quand il apparaît, mais aucun `resize` de `window`
    // ne se déclenche pour ce type de reflow — seul un sibling flex a
    // changé. Sans un observateur sur le canvas lui-même, la caméra reste
    // calée sur l'ancienne taille et les objets se dessinent hors du
    // nouveau tampon : le plateau paraît vide. `use-board-camera.ts`
    // observe désormais aussi le canvas.
    interface FakeResizeObserverInstance {
      readonly callback: ResizeObserverCallback;
    }
    const instances: FakeResizeObserverInstance[] = [];
    class FakeResizeObserver {
      readonly callback: ResizeObserverCallback;
      constructor(callback: ResizeObserverCallback) {
        this.callback = callback;
        instances.push(this);
      }
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    }
    vi.stubGlobal('ResizeObserver', FakeResizeObserver);

    render(<App />);

    const canvas = within(screen.getByRole('region', { name: 'Plateau de jeu' })).getByRole('img', {
      name: 'Rendu du plateau',
    });
    const initialZoom = Number(canvas.getAttribute('data-camera-zoom'));
    expect(instances.length).toBeGreaterThan(0);

    // Simulate a much shorter canvas — the same reflow a flex sibling (the
    // victory banner, a selection's context panel) can cause without ever
    // firing a `window` resize event.
    const shrunkCanvasRect: DOMRect = {
      x: 0,
      y: 0,
      left: 0,
      top: 0,
      right: BOARD_CANVAS_WIDTH_IN_CSS_PIXELS,
      bottom: 150,
      width: BOARD_CANVAS_WIDTH_IN_CSS_PIXELS,
      height: 150,
      toJSON() {
        return this;
      },
    };
    vi.spyOn(HTMLCanvasElement.prototype, 'getBoundingClientRect').mockReturnValue(
      shrunkCanvasRect,
    );

    act(() => {
      for (const instance of instances) {
        instance.callback([], instance as unknown as ResizeObserver);
      }
    });

    const resizedZoom = Number(canvas.getAttribute('data-camera-zoom'));
    expect(resizedZoom).not.toBe(initialZoom);
  });

  it('réserve en permanence un unique emplacement partagé pour le résultat, dès le tout premier rendu, pour qu’aucune phase ne redimensionne le plateau', () => {
    window.history.replaceState(null, '', '/demo');
    // B5 (plan-remise-en-jeu.md § 4 bis): the ResizeObserver B1 added (see
    // the test above) refits the camera on *any* CSS size change of the
    // canvas — including the reflow the victory/failure banner used to cause
    // by mounting as a brand new flex sibling under `.scene-frame` right when
    // the outcome became known.
    //
    // A first version of this fix only reserved a slot outside
    // `'construction'` (i.e. from the moment "Tester" is pressed). Playing it
    // manually showed that this still moved the resize — just to an earlier
    // moment, from "Tester" onward — rather than removing it. A second
    // version reserved unconditionally, but gave `ContextPanel` its *own*
    // separate reservation alongside this one: since the two never have
    // content at the same time (this one only in `'result'`, `ContextPanel`
    // only in `'construction'`), that meant permanent, simultaneous, unfilled
    // space for both — 392px measured on a wide viewport, of which 200px
    // never fills at all on a level with nothing to select. `App.tsx` now
    // mounts both inside one shared `.status-slot`, unconditionally, so the
    // exact same DOM node exists for the whole lifetime of the app, and only
    // one reservation exists, sized to the larger of the two contents.
    const animationFrames = createAnimationFrameHarness();
    render(<App />);

    const workspace = screen.getByRole('region', { name: 'Espace de construction' });
    const canvas = within(screen.getByRole('region', { name: 'Plateau de jeu' })).getByRole('img', {
      name: 'Rendu du plateau',
    });
    const zoomAtMount = canvas.getAttribute('data-camera-zoom');

    // Reserved from the very first render, before "Tester" is even pressed —
    // and it is the *only* reserved slot: no leftover per-component wrapper.
    const slotAtMount = workspace.querySelector('.status-slot');
    expect(slotAtMount).not.toBeNull();
    expect(workspace.querySelectorAll('.status-slot')).toHaveLength(1);
    expect(styles).not.toMatch(/\.level-result-slot\s*\{/);
    expect(styles).not.toMatch(/\.context-panel-slot\s*\{/);
    expect(screen.queryByRole('region', { name: 'Résultat du niveau' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Tester' }));

    // The moment a first, incomplete fix still got wrong: clicking "Tester"
    // must not touch the slot or the camera either.
    expect(workspace.querySelector('.status-slot')).toBe(slotAtMount);
    expect(canvas.getAttribute('data-camera-zoom')).toBe(zoomAtMount);

    advanceSimulationToResult(animationFrames, 600);

    // The banner appears — the reflow-sensitive moment the original bug
    // report described — but the reserved slot is still the very same DOM
    // node: no flex sibling was ever added or removed under `.scene-frame`.
    expect(workspace.querySelector('.status-slot')).toBe(slotAtMount);
    const result = screen.getByRole('region', { name: 'Résultat du niveau' });
    expect(within(result).getByText('Victoire')).toBeVisible();
    expect(canvas.getAttribute('data-camera-zoom')).toBe(zoomAtMount);

    // The slot's CSS reserves height regardless of content — this is what
    // makes the DOM-identity guarantee above actually prevent a resize in a
    // real browser (verified manually; jsdom does no layout).
    expect(styles).toMatch(/\.status-slot\s*\{[^}]*min-height:\s*\d/s);

    // Disparition: replaying returns to construction. The slot stays
    // mounted (same node) with its content cleared, and the camera — fit to
    // the same scene and the same canvas size throughout — never changed.
    fireEvent.click(within(result).getByRole('button', { name: 'Rejouer le niveau' }));

    expect(workspace.querySelector('.status-slot')).toBe(slotAtMount);
    expect(screen.queryByRole('region', { name: 'Résultat du niveau' })).not.toBeInTheDocument();
    expect(canvas.getAttribute('data-camera-zoom')).toBe(zoomAtMount);
  });

  it('après un vrai redimensionnement du canvas signalé par le ResizeObserver, la caméra garde toute la scène visible (non-régression B1)', () => {
    // B5 must not weaken what B1 fixed: a genuine size change of the canvas
    // (the ResizeObserver's actual purpose) still has to produce a complete
    // `fitCameraToScene`, which is what guarantees the whole scene rectangle
    // stays contained in the canvas (tested on its own in
    // `board-camera.test.ts`). Cross-checking the DOM-observed zoom against a
    // direct call to that same pure function is a stronger assertion than
    // "the zoom changed": it pins down *which* framing was produced, not just
    // that some recomputation happened.
    interface FakeResizeObserverInstance {
      readonly callback: ResizeObserverCallback;
    }
    const instances: FakeResizeObserverInstance[] = [];
    class FakeResizeObserver {
      readonly callback: ResizeObserverCallback;
      constructor(callback: ResizeObserverCallback) {
        this.callback = callback;
        instances.push(this);
      }
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    }
    vi.stubGlobal('ResizeObserver', FakeResizeObserver);

    render(<App />);

    const canvas = within(screen.getByRole('region', { name: 'Plateau de jeu' })).getByRole('img', {
      name: 'Rendu du plateau',
    });
    const initialZoom = Number(canvas.getAttribute('data-camera-zoom'));
    expect(instances.length).toBeGreaterThan(0);

    const shrunkCanvasSize = { width: BOARD_CANVAS_WIDTH_IN_CSS_PIXELS, height: 150 };
    const shrunkCanvasRect: DOMRect = {
      x: 0,
      y: 0,
      left: 0,
      top: 0,
      right: shrunkCanvasSize.width,
      bottom: shrunkCanvasSize.height,
      width: shrunkCanvasSize.width,
      height: shrunkCanvasSize.height,
      toJSON() {
        return this;
      },
    };
    vi.spyOn(HTMLCanvasElement.prototype, 'getBoundingClientRect').mockReturnValue(
      shrunkCanvasRect,
    );

    act(() => {
      for (const instance of instances) {
        instance.callback([], instance as unknown as ResizeObserver);
      }
    });

    const resizedZoom = Number(canvas.getAttribute('data-camera-zoom'));
    // The app starts on the embedded level 1 (B1); its declared scene is the
    // ground truth for what "fully visible" means.
    const expectedZoom = fitCameraToScene(levelOneScene, shrunkCanvasSize).pixelsPerWorldUnit;

    expect(resizedZoom).not.toBe(initialZoom);
    expect(resizedZoom).toBeCloseTo(expectedZoom, 6);
  });

  it('après un vrai redimensionnement de la fenêtre (rotation d’écran), la caméra garde toute la scène visible (non-régression B1)', () => {
    // Same guarantee as above, through the other trigger use-board-camera.ts
    // listens to: `window`'s own `resize` event (e.g. an orientation change),
    // which predates B1 and must keep working exactly as it did.
    render(<App />);

    const canvas = within(screen.getByRole('region', { name: 'Plateau de jeu' })).getByRole('img', {
      name: 'Rendu du plateau',
    });
    const initialZoom = Number(canvas.getAttribute('data-camera-zoom'));

    // A portrait/landscape flip of the stubbed 800 × 450 canvas.
    const rotatedCanvasSize = { width: 450, height: 800 };
    const rotatedCanvasRect: DOMRect = {
      x: 0,
      y: 0,
      left: 0,
      top: 0,
      right: rotatedCanvasSize.width,
      bottom: rotatedCanvasSize.height,
      width: rotatedCanvasSize.width,
      height: rotatedCanvasSize.height,
      toJSON() {
        return this;
      },
    };
    vi.spyOn(HTMLCanvasElement.prototype, 'getBoundingClientRect').mockReturnValue(
      rotatedCanvasRect,
    );

    act(() => {
      window.dispatchEvent(new Event('resize'));
    });

    const resizedZoom = Number(canvas.getAttribute('data-camera-zoom'));
    const expectedZoom = fitCameraToScene(levelOneScene, rotatedCanvasSize).pixelsPerWorldUnit;

    expect(resizedZoom).not.toBe(initialZoom);
    expect(resizedZoom).toBeCloseTo(expectedZoom, 6);
  });

  it('affiche le panneau contextuel dans le même emplacement partagé que le résultat, sans en ajouter un second', () => {
    // Signalé par l'utilisateur en jouant, après B5 : le panneau contextuel
    // (« Objet sélectionné : … », affiché dès qu'un placement existe, car
    // c'est le seul objet qu'un placement peut sélectionner aujourd'hui — le
    // clic de sélection sur le plateau est C3, pas encore livré) avait reçu
    // sa propre réservation indépendante de celle du résultat — donc deux
    // blocs d'espace mort simultanés et permanents sous le plateau, alors
    // qu'aucun niveau ne peut jamais afficher les deux à la fois. Il partage
    // désormais `.status-slot` avec `LevelResult` (voir le test précédent) :
    // ce test vérifie que la sélection apparaît bien dans cet unique
    // emplacement partagé, sans en créer un second.
    render(<App />);
    openEmbeddedWorkshop();

    const workspace = screen.getByRole('region', { name: 'Espace de construction' });
    const canvas = within(screen.getByRole('region', { name: 'Plateau de jeu' })).getByRole('img', {
      name: 'Rendu du plateau',
    });
    const zoomAtMount = canvas.getAttribute('data-camera-zoom');

    // Réservé dès le premier rendu, avant tout placement — et c'est le seul.
    const slotAtMount = workspace.querySelector('.status-slot');
    expect(slotAtMount).not.toBeNull();
    expect(workspace.querySelectorAll('.status-slot')).toHaveLength(1);
    expect(screen.queryByText(/Objet sélectionné/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Ouvrir le catalogue' }));
    fireEvent.click(screen.getByRole('button', { name: 'Poutre moyenne' }));

    const board = screen.getByRole('region', { name: 'Plateau de jeu' });
    firePointerEvent(board, 'pointerdown', {
      pointerId: 1,
      pointerType: 'touch',
      clientX: 400,
      clientY: 225,
    });
    firePointerEvent(board, 'pointerup', {
      pointerId: 1,
      pointerType: 'touch',
      clientX: 400,
      clientY: 225,
    });

    // Le placement se sélectionne automatiquement : le panneau apparaît dans
    // le même nœud DOM réservé, toujours unique, sans jamais en créer un
    // second à côté.
    expect(workspace.querySelector('.status-slot')).toBe(slotAtMount);
    expect(workspace.querySelectorAll('.status-slot')).toHaveLength(1);
    const propertiesPanel = screen.getByRole('region', { name: 'Propriétés de Poutre' });
    expect(within(propertiesPanel).getByText('Propriétés')).toBeVisible();
    expect(within(propertiesPanel).getByText('Poutre')).toBeVisible();
    expect(canvas.getAttribute('data-camera-zoom')).toBe(zoomAtMount);

    fireEvent.click(screen.getByRole('button', { name: 'Annuler' }));

    // Annuler retire le placement, donc sa sélection : le panneau disparaît,
    // le nœud réservé reste, le cadrage n'a pas bougé.
    expect(workspace.querySelector('.status-slot')).toBe(slotAtMount);
    expect(screen.queryByText(/Objet sélectionné/)).not.toBeInTheDocument();
    expect(canvas.getAttribute('data-camera-zoom')).toBe(zoomAtMount);
  });

  it('sélectionne un objet existant au toucher puis désélectionne au toucher du vide', () => {
    render(<App />);

    const board = screen.getByRole('region', { name: 'Plateau de jeu' });
    // Use the canvas camera so this follows the embedded placement if the
    // scene geometry changes again.
    tapWorldPoint(2.3, 1.177);

    const lockedPanel = screen.getByRole('region', { name: 'Propriétés de Balle' });
    expect(lockedPanel).toBeVisible();
    expect(lockedPanel).toHaveTextContent(/verrouill|indisponible/i);
    expect(
      within(lockedPanel).queryByRole('button', {
        name: /Supprimer|Rotation|gauche|droite|haut|bas/i,
      }),
    ).not.toBeInTheDocument();

    firePointerEvent(board, 'pointerdown', {
      pointerId: 2,
      pointerType: 'mouse',
      clientX: 120,
      clientY: 400,
    });
    firePointerEvent(board, 'pointerup', {
      pointerId: 2,
      pointerType: 'mouse',
      clientX: 120,
      clientY: 400,
    });

    expect(screen.queryByRole('region', { name: 'Propriétés de Balle' })).not.toBeInTheDocument();
  });

  it('place une masse depuis l’inventaire de l’atelier', () => {
    render(<App />);
    placeWorkshopObject('Masse');

    const panel = screen.getByRole('region', { name: 'Propriétés de Masse' });
    expect(within(panel).getByRole('button', { name: /Supprimer la masse/i })).toBeVisible();
    expect(within(panel).queryByRole('button', { name: /Rotation/ })).not.toBeInTheDocument();
  });

  it('relie un levier à un convoyeur au toucher, puis délie le circuit', () => {
    render(<App />);
    openEmbeddedWorkshop();
    // Atelier 16 × 9 ajusté au canvas 800 × 450 : 50 px par unité monde.
    const board = placeFromCatalogue('Convoyeur', 600, 225);
    placeFromCatalogue('Levier', 200, 225);

    const leverPanel = screen.getByRole('region', { name: 'Propriétés de Levier' });
    fireEvent.click(within(leverPanel).getByRole('button', { name: 'Relier à un appareil' }));
    expect(within(leverPanel).getByRole('button', { name: 'Supprimer le levier' })).toBeVisible();
    expect(
      within(leverPanel).getByText(/Touchez le convoyeur, le ventilateur ou la barrière/),
    ).toBeVisible();

    tapBoard(board, 600, 225);

    const wiredPanel = screen.getByRole('region', { name: 'Propriétés de Levier' });
    expect(within(wiredPanel).getByText('Circuit A')).toBeVisible();
    fireEvent.click(within(wiredPanel).getByRole('button', { name: 'Délier le circuit A' }));
    expect(within(wiredPanel).queryByText('Circuit A')).not.toBeInTheDocument();
  });

  it('relie un bouton à un ventilateur, jamais à un convoyeur', () => {
    render(<App />);
    openEmbeddedWorkshop();
    const board = placeFromCatalogue('Ventilateur', 600, 225);
    placeFromCatalogue('Convoyeur', 400, 100);
    placeFromCatalogue('Bouton', 200, 225);

    const buttonPanel = screen.getByRole('region', { name: 'Propriétés de Bouton' });
    fireEvent.click(within(buttonPanel).getByRole('button', { name: 'Relier à un appareil' }));
    expect(within(buttonPanel).getByText(/Touchez le ventilateur ou la barrière/)).toBeVisible();

    tapBoard(board, 400, 100);
    expect(
      screen.getByText('Touchez un ventilateur ou une barrière pour le relier au bouton.'),
    ).toBeVisible();

    tapBoard(board, 600, 225);
    expect(
      within(screen.getByRole('region', { name: 'Propriétés de Bouton' })).getByText('Circuit A'),
    ).toBeVisible();
  });

  it('oriente ventilateur, barrière et tremplin par quarts de tour, et règle leur état de départ', () => {
    render(<App />);
    placeWorkshopObject('Ventilateur');
    const fanPanel = screen.getByRole('region', { name: 'Propriétés de Ventilateur' });
    expect(within(fanPanel).queryByRole('combobox', { name: 'Sens du souffle' })).toBeNull();
    expect(within(fanPanel).getByRole('button', { name: 'Rotation positive' })).toHaveTextContent(
      '90°',
    );
    fireEvent.click(within(fanPanel).getByRole('button', { name: 'Rotation positive' }));
    expect(screen.getByRole('button', { name: 'Annuler' })).toBeEnabled();
    fireEvent.change(screen.getByRole('combobox', { name: 'État de départ' }), {
      target: { value: 'off' },
    });
    expect(screen.getByRole('combobox', { name: 'État de départ' })).toHaveValue('off');

    placeFromCatalogue('Barrière', 200, 225);
    const barrierPanel = screen.getByRole('region', { name: 'Propriétés de Barrière' });
    expect(within(barrierPanel).queryByRole('combobox', { name: 'Côté de la barre' })).toBeNull();
    expect(
      within(barrierPanel).getByRole('button', { name: 'Rotation négative' }),
    ).toHaveTextContent('90°');
    fireEvent.change(screen.getByRole('combobox', { name: 'État de départ' }), {
      target: { value: 'open' },
    });
    expect(screen.getByRole('combobox', { name: 'État de départ' })).toHaveValue('open');

    placeFromCatalogue('Tremplin', 600, 100);
    const springboardPanel = screen.getByRole('region', { name: 'Propriétés de Tremplin' });
    expect(
      within(springboardPanel).getByRole('button', { name: 'Rotation positive' }),
    ).toHaveTextContent('90°');
  });

  it('règle la position de départ d’un levier et le sens d’un convoyeur', () => {
    render(<App />);
    placeWorkshopObject('Levier');
    fireEvent.change(screen.getByRole('combobox', { name: 'Position de départ' }), {
      target: { value: 'left' },
    });
    expect(screen.getByRole('combobox', { name: 'Position de départ' })).toHaveValue('left');

    placeFromCatalogue('Convoyeur', 600, 225);
    fireEvent.change(screen.getByRole('combobox', { name: 'Sens du tapis' }), {
      target: { value: 'right' },
    });
    expect(screen.getByRole('combobox', { name: 'Sens du tapis' })).toHaveValue('right');
  });

  it('affiche les propriétés accessibles d’une poutre sans action Déplacer', () => {
    render(<App />);
    placeWorkshopBeam();

    const panel = screen.getByRole('region', { name: 'Propriétés de Poutre' });
    expect(panel).toBeVisible();
    expect(within(panel).queryByRole('button', { name: /Déplacer/i })).not.toBeInTheDocument();
    expect(within(panel).getByRole('button', { name: /Supprimer la poutre/i })).toBeVisible();
    expect(within(panel).getByRole('button', { name: 'Rotation négative' })).toBeVisible();
    expect(within(panel).getByRole('button', { name: 'Rotation positive' })).toBeVisible();
    for (const direction of ['gauche', 'droite', 'haut', 'bas']) {
      expect(within(panel).getByRole('button', { name: new RegExp(direction, 'i') })).toBeVisible();
    }
  });

  it('déplace directement une poutre en une seule entrée d’historique sans déplacer la caméra', () => {
    render(<App />);
    const board = placeWorkshopBeam();
    const undoButton = screen.getByRole('button', { name: 'Annuler' });
    const canvas = within(board).getByRole('img', { name: 'Rendu du plateau' });
    const zoomBeforeDrag = canvas.getAttribute('data-camera-zoom');

    firePointerEvent(board, 'pointerdown', {
      pointerId: 2,
      pointerType: 'touch',
      clientX: 400,
      clientY: 225,
    });
    firePointerEvent(board, 'pointermove', {
      pointerId: 2,
      pointerType: 'touch',
      clientX: 500,
      clientY: 265,
    });
    firePointerEvent(board, 'pointerup', {
      pointerId: 2,
      pointerType: 'touch',
      clientX: 500,
      clientY: 265,
    });

    expect(undoButton).toBeEnabled();
    expect(canvas.getAttribute('data-camera-zoom')).toBe(zoomBeforeDrag);

    // One direct drag is one command: the first undo restores the original
    // placement, while the second undo removes the placement itself.
    fireEvent.click(undoButton);
    expect(screen.getByRole('region', { name: 'Propriétés de Poutre' })).toBeVisible();
    fireEvent.click(undoButton);
    expect(screen.queryByRole('region', { name: 'Propriétés de Poutre' })).not.toBeInTheDocument();

    // A camera pan would move this fixed workshop object away from its known
    // screen position. It must remain selectable after the object drag.
    firePointerEvent(board, 'pointerdown', {
      pointerId: 3,
      pointerType: 'touch',
      clientX: 400,
      clientY: 48,
    });
    firePointerEvent(board, 'pointerup', {
      pointerId: 3,
      pointerType: 'touch',
      clientX: 400,
      clientY: 48,
    });
    expect(screen.getByRole('region', { name: 'Propriétés de Balle' })).toBeVisible();
  });

  it('annule un déplacement direct sur pointercancel sans entrée d’historique', () => {
    render(<App />);
    const board = placeWorkshopBeam();
    const undoButton = screen.getByRole('button', { name: 'Annuler' });
    expect(screen.getByRole('region', { name: 'Propriétés de Poutre' })).toBeVisible();

    firePointerEvent(board, 'pointerdown', {
      pointerId: 2,
      pointerType: 'touch',
      clientX: 400,
      clientY: 225,
    });
    firePointerEvent(board, 'pointermove', {
      pointerId: 2,
      pointerType: 'touch',
      clientX: 500,
      clientY: 265,
    });
    firePointerEvent(board, 'pointercancel', {
      pointerId: 2,
      pointerType: 'touch',
      clientX: 500,
      clientY: 265,
    });

    expect(undoButton).toBeEnabled();
    fireEvent.click(undoButton);
    expect(screen.queryByRole('region', { name: 'Propriétés de Poutre' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Placement refusé/i })).not.toBeInTheDocument();
  });

  it('expose la taille d’une poutre et annule le changement Longue en une commande', () => {
    render(<App />);
    placeWorkshopBeam();

    const panel = screen.getByRole('region', { name: 'Propriétés de Poutre' });
    const sizeControl = within(panel).getByRole('combobox', { name: /longueur|taille/i });
    const undoButton = screen.getByRole('button', { name: 'Annuler' });

    expect(within(sizeControl).getByRole('option', { name: 'Courte' })).toBeInTheDocument();
    expect(within(sizeControl).getByRole('option', { name: 'Moyenne' })).toBeInTheDocument();
    expect(within(sizeControl).getByRole('option', { name: 'Longue' })).toBeInTheDocument();
    expect(sizeControl).toHaveValue('medium');

    fireEvent.change(sizeControl, { target: { value: 'long' } });
    expect(sizeControl).toHaveValue('long');

    // The size edit is atomic: undo restores the initially placed medium beam,
    // and a second undo is still required to remove the placement itself.
    fireEvent.click(undoButton);
    expect(within(panel).getByRole('combobox', { name: /longueur|taille/i })).toHaveValue('medium');
    fireEvent.click(undoButton);
    expect(screen.queryByRole('region', { name: 'Propriétés de Poutre' })).not.toBeInTheDocument();
  });

  it('en mode auteur permet de sélectionner et déplacer le sol verrouillé du futur joueur', () => {
    render(<App />);
    openEmbeddedWorkshop();

    const board = screen.getByRole('region', { name: 'Plateau de jeu' });
    // workshop-floor is at (8, 8). The workshop scene is fitted at 48 px/unit
    // in this 800 × 450 fixture, hence the centre is (384, 384) CSS px.
    firePointerEvent(board, 'pointerdown', {
      pointerId: 1,
      pointerType: 'touch',
      clientX: 384,
      clientY: 384,
    });
    firePointerEvent(board, 'pointerup', {
      pointerId: 1,
      pointerType: 'touch',
      clientX: 384,
      clientY: 384,
    });

    const panel = screen.getByRole('region', { name: 'Propriétés de Poutre' });
    expect(panel).not.toHaveTextContent(/verrouill/i);
    expect(within(panel).getByRole('button', { name: 'Rotation négative' })).toBeVisible();
    expect(within(panel).getByRole('button', { name: 'Rotation positive' })).toBeVisible();
    expect(within(panel).getByRole('button', { name: /Supprimer la poutre/i })).toBeVisible();

    const undoButton = screen.getByRole('button', { name: 'Annuler' });
    firePointerEvent(board, 'pointerdown', {
      pointerId: 2,
      pointerType: 'touch',
      clientX: 384,
      clientY: 384,
    });
    firePointerEvent(board, 'pointermove', {
      pointerId: 2,
      pointerType: 'touch',
      clientX: 430,
      clientY: 350,
    });
    firePointerEvent(board, 'pointerup', {
      pointerId: 2,
      pointerType: 'touch',
      clientX: 430,
      clientY: 350,
    });
    expect(undoButton).toBeEnabled();
  });

  it('en mode auteur rend interactive la poignée de rotation du sol malgré rotate=false', () => {
    render(<App />);
    openEmbeddedWorkshop();

    const board = screen.getByRole('region', { name: 'Plateau de jeu' });
    firePointerEvent(board, 'pointerdown', {
      pointerId: 1,
      pointerType: 'touch',
      clientX: 384,
      clientY: 384,
    });
    firePointerEvent(board, 'pointerup', {
      pointerId: 1,
      pointerType: 'touch',
      clientX: 384,
      clientY: 384,
    });

    const undoButton = screen.getByRole('button', { name: 'Annuler' });
    const handleY = 384 - ROTATION_HANDLE_DISTANCE_CSS_PIXELS;
    firePointerEvent(board, 'pointerdown', {
      pointerId: 2,
      pointerType: 'touch',
      clientX: 384,
      clientY: handleY,
    });
    firePointerEvent(board, 'pointermove', {
      pointerId: 2,
      pointerType: 'touch',
      clientX: 400,
      clientY: handleY,
    });
    firePointerEvent(board, 'pointerup', {
      pointerId: 2,
      pointerType: 'touch',
      clientX: 400,
      clientY: handleY,
    });

    expect(undoButton).toBeEnabled();
    fireEvent.click(undoButton);
    expect(screen.getByRole('region', { name: 'Propriétés de Poutre' })).toBeVisible();
  });

  it('annule atomiquement un drag lorsqu’un second pointeur arrive sur l’objet', () => {
    render(<App />);
    const board = placeWorkshopBeam();
    const undoButton = screen.getByRole('button', { name: 'Annuler' });

    firePointerEvent(board, 'pointerdown', {
      pointerId: 2,
      pointerType: 'touch',
      clientX: 400,
      clientY: 225,
    });
    firePointerEvent(board, 'pointermove', {
      pointerId: 2,
      pointerType: 'touch',
      clientX: 500,
      clientY: 265,
    });
    // The first pointer's temporary projection is now at (500, 265); a
    // second touch there must cancel the move before camera pinch handling.
    firePointerEvent(board, 'pointerdown', {
      pointerId: 3,
      pointerType: 'touch',
      clientX: 500,
      clientY: 265,
    });
    firePointerEvent(board, 'pointerup', {
      pointerId: 3,
      pointerType: 'touch',
      clientX: 500,
      clientY: 265,
    });
    firePointerEvent(board, 'pointerup', {
      pointerId: 2,
      pointerType: 'touch',
      clientX: 500,
      clientY: 265,
    });

    // Only the original placement remains in history: undo removes it rather
    // than first undoing a committed move.
    fireEvent.click(undoButton);
    expect(screen.queryByRole('region', { name: 'Propriétés de Poutre' })).not.toBeInTheDocument();
  });

  it('déplace une poutre par sa poignée de rotation en une commande et annule la projection', () => {
    render(<App />);
    const board = placeWorkshopBeam();
    const undoButton = screen.getByRole('button', { name: 'Annuler' });

    // The handle is 32 CSS px above the beam centre (400, 225), as defined by
    // the renderer's fixed-distance handle contract.
    firePointerEvent(board, 'pointerdown', {
      pointerId: 2,
      pointerType: 'touch',
      clientX: 400,
      clientY: 193,
    });
    firePointerEvent(board, 'pointermove', {
      pointerId: 2,
      pointerType: 'touch',
      clientX: 420,
      clientY: 193,
    });
    firePointerEvent(board, 'pointerup', {
      pointerId: 2,
      pointerType: 'touch',
      clientX: 420,
      clientY: 193,
    });

    // One rotation command: undo leaves the placed beam selected, and the
    // following undo removes the placement itself.
    fireEvent.click(undoButton);
    expect(screen.getByRole('region', { name: 'Propriétés de Poutre' })).toBeVisible();

    firePointerEvent(board, 'pointerdown', {
      pointerId: 3,
      pointerType: 'touch',
      clientX: 400,
      clientY: 193,
    });
    firePointerEvent(board, 'pointermove', {
      pointerId: 3,
      pointerType: 'touch',
      clientX: 420,
      clientY: 193,
    });
    firePointerEvent(board, 'pointercancel', {
      pointerId: 3,
      pointerType: 'touch',
      clientX: 420,
      clientY: 193,
    });

    fireEvent.click(undoButton);
    expect(screen.queryByRole('region', { name: 'Propriétés de Poutre' })).not.toBeInTheDocument();
  });
});

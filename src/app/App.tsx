import { useEffect, useRef, useState, useSyncExternalStore } from 'react';

import {
  createConstructionAttempt,
  placeFromInventory,
} from '../application/construction/construction-attempt';
import {
  beginEditorManipulation,
  cancelEditorManipulation,
  commitEditorManipulation,
  createEditorSession,
  previewEditorManipulation,
  redoEditorCommand,
  undoEditorCommand,
  type EditorSession,
} from '../application/editor-session/editor-session';
import { levelDocumentSchema } from '../domain/level-document';
import { screenPointToWorld, type BoardOffset, type ScreenPoint } from './screen-point-to-world';

type ObjectKind = 'Balle' | 'Panier' | 'Poutre' | 'Bascule';

interface PlacementTool {
  readonly kind: ObjectKind;
  readonly inventoryEntryId: string;
  readonly placementId: string;
}

const objectKinds: readonly { kind: ObjectKind; description: string }[] = [
  { kind: 'Balle', description: 'Un corps libre entraîné par la gravité' },
  { kind: 'Panier', description: 'La cible finale de la scène' },
  { kind: 'Poutre', description: 'Trois longueurs pour guider la balle' },
  { kind: 'Bascule', description: 'Une bascule préassemblée' },
];

const inventoryByObjectKind: Readonly<Record<ObjectKind, string>> = {
  Balle: 'inventory-ball',
  Panier: 'inventory-basket',
  Poutre: 'inventory-beam',
  Bascule: 'inventory-seesaw',
};

const workshopDocument = levelDocumentSchema.parse({
  schemaVersion: 1,
  id: 'free-workshop',
  metadata: { title: 'Atelier de niveau' },
  objects: [
    {
      id: 'goal-ball',
      type: 'ball',
      props: {},
      transform: { position: { x: 40, y: 40 }, rotation: 0 },
      permissions: { move: false, rotate: false, remove: false },
    },
    {
      id: 'goal-basket',
      type: 'basket',
      props: {},
      transform: { position: { x: 600, y: 400 }, rotation: 0 },
      permissions: { move: false, rotate: false, remove: false },
    },
  ],
  inventory: [
    {
      id: 'inventory-ball',
      type: 'ball',
      props: {},
      quantity: 99,
      permissions: { move: true, rotate: false, remove: true },
    },
    {
      id: 'inventory-basket',
      type: 'basket',
      props: {},
      quantity: 99,
      permissions: { move: true, rotate: false, remove: true },
    },
    {
      id: 'inventory-beam',
      type: 'beam',
      props: { size: 'medium' },
      quantity: 99,
      permissions: { move: true, rotate: true, remove: true },
    },
    {
      id: 'inventory-seesaw',
      type: 'seesaw',
      props: {},
      quantity: 99,
      permissions: { move: true, rotate: false, remove: true },
    },
  ],
  goal: { type: 'basket', ballId: 'goal-ball', basketId: 'goal-basket' },
  buildZones: [{ min: { x: 0, y: 0 }, max: { x: 640, y: 480 } }],
});

const initialSession = (): EditorSession =>
  createEditorSession('creation', createConstructionAttempt(workshopDocument));

const refusalMessage = (reason: string): string =>
  reason === 'outside-build-zone'
    ? 'Placement refusé : choisissez une position dans la zone de construction.'
    : 'Placement refusé : cette action est indisponible.';

const unavailablePositionMessage = 'Placement refusé : la position tactile est indisponible.';
const unavailableViewportMessage = 'Placement refusé : le cadrage du plateau est indisponible.';
const placementZoom = 1;

const hasFiniteCoordinates = (point: ScreenPoint): boolean =>
  Number.isFinite(point.x) && Number.isFinite(point.y);

const hasUsableZoom = (zoom: number): boolean => Number.isFinite(zoom) && zoom > 0;

const pointerIdFromEvent = (pointerId: unknown): number | null =>
  typeof pointerId === 'number' && Number.isFinite(pointerId) ? pointerId : null;

const isActivePointer = (
  activePointer: { readonly id: number | null } | null,
  pointerId: number | null,
): boolean =>
  activePointer !== null && (activePointer.id === null || activePointer.id === pointerId);

function subscribeToSideLayout(onChange: () => void) {
  if (typeof window === 'undefined') {
    return () => undefined;
  }

  window.addEventListener('resize', onChange);
  window.addEventListener('orientationchange', onChange);

  return () => {
    window.removeEventListener('resize', onChange);
    window.removeEventListener('orientationchange', onChange);
  };
}

function getSideLayoutSnapshot() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }

  return (
    window.innerWidth >= 680 || (window.innerWidth >= 560 && window.innerWidth > window.innerHeight)
  );
}

export function App() {
  const [placementTool, setPlacementTool] = useState<PlacementTool | null>(null);
  const [session, setSession] = useState<EditorSession>(initialSession);
  const [feedback, setFeedback] = useState<string | null>(null);
  const nextPlacementNumber = useRef(1);
  const sessionRef = useRef(session);
  const placementToolRef = useRef<PlacementTool | null>(placementTool);
  const hasValidPlacementPreview = useRef(false);
  const activePointer = useRef<{ readonly id: number | null } | null>(null);
  const capturedPointerId = useRef<number | null>(null);
  const isSideLayout = useSyncExternalStore(
    subscribeToSideLayout,
    getSideLayoutSnapshot,
    () => false,
  );
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const drawerIsExpanded = isDrawerOpen || isSideLayout;
  const selectedObject = placementTool?.kind;
  const updateSession = (nextSession: EditorSession): void => {
    sessionRef.current = nextSession;
    setSession(nextSession);
  };
  const updatePlacementTool = (nextTool: PlacementTool | null): void => {
    placementToolRef.current = nextTool;
    setPlacementTool(nextTool);
  };

  const cancelPlacementProjection = (): void => {
    const result = cancelEditorManipulation(sessionRef.current);
    if (result.status === 'accepted') {
      updateSession(result.session);
    }
    hasValidPlacementPreview.current = false;
    activePointer.current = null;
  };

  const releasePointerCapture = (element: HTMLDivElement, pointerId: number): void => {
    if (capturedPointerId.current !== pointerId) return;

    capturedPointerId.current = null;
    if (typeof element.releasePointerCapture !== 'function') return;
    try {
      element.releasePointerCapture(pointerId);
    } catch {
      // A browser can release capture before dispatching pointercancel.
    }
  };

  const activatePlacement = (kind: ObjectKind): void => {
    const placementId = `placement-${String(nextPlacementNumber.current)}`;
    nextPlacementNumber.current += 1;
    const result = beginEditorManipulation(session, { kind: 'placement', placementId });
    if (result.status === 'rejected') {
      setFeedback(refusalMessage(result.reason));
      return;
    }

    updateSession(result.session);
    updatePlacementTool({ kind, placementId, inventoryEntryId: inventoryByObjectKind[kind] });
    hasValidPlacementPreview.current = false;
    activePointer.current = null;
    capturedPointerId.current = null;
    setIsDrawerOpen(false);
    setFeedback(null);
  };

  const placeAt = (point: ScreenPoint, boardRect: BoardOffset): void => {
    const activeTool = placementToolRef.current;
    if (activeTool === null) return;

    if (!hasFiniteCoordinates(point)) {
      hasValidPlacementPreview.current = false;
      setFeedback(unavailablePositionMessage);
      return;
    }
    if (!hasUsableZoom(placementZoom)) {
      hasValidPlacementPreview.current = false;
      setFeedback(unavailableViewportMessage);
      return;
    }

    let currentSession = sessionRef.current;
    if (currentSession.manipulation === null) {
      const resumed = beginEditorManipulation(currentSession, {
        kind: 'placement',
        placementId: activeTool.placementId,
      });
      if (resumed.status === 'rejected') {
        hasValidPlacementPreview.current = false;
        setFeedback(refusalMessage(resumed.reason));
        return;
      }
      currentSession = resumed.session;
      updateSession(currentSession);
    }

    const worldPosition = screenPointToWorld(point, boardRect, placementZoom);

    const result = previewEditorManipulation(
      currentSession,
      placeFromInventory({
        context: currentSession.mode === 'resolution' ? 'player' : 'author',
        inventoryEntryId: activeTool.inventoryEntryId,
        placementId: activeTool.placementId,
        transform: {
          position: worldPosition,
          rotation: 0,
        },
      }),
    );
    updateSession(result.session);
    if (result.status === 'rejected') {
      hasValidPlacementPreview.current = false;
      setFeedback(refusalMessage(result.reason));
    } else {
      hasValidPlacementPreview.current = true;
    }
  };

  const commitPlacement = (): void => {
    if (placementToolRef.current === null || !hasValidPlacementPreview.current) return;

    const result = commitEditorManipulation(sessionRef.current);
    updateSession(result.session);
    if (result.status === 'accepted') {
      updatePlacementTool(null);
      hasValidPlacementPreview.current = false;
      setFeedback(null);
    } else {
      setFeedback(refusalMessage(result.reason));
    }
  };

  useEffect(() => {
    const cancelForLayoutChange = (): void => {
      if (placementToolRef.current === null) return;

      const result = cancelEditorManipulation(sessionRef.current);
      if (result.status === 'accepted') {
        updateSession(result.session);
      }
      hasValidPlacementPreview.current = false;
      activePointer.current = null;
      capturedPointerId.current = null;
      setFeedback('Placement annulé : le cadrage du plateau a changé.');
    };

    window.addEventListener('resize', cancelForLayoutChange);
    window.addEventListener('orientationchange', cancelForLayoutChange);
    return () => {
      window.removeEventListener('resize', cancelForLayoutChange);
      window.removeEventListener('orientationchange', cancelForLayoutChange);
    };
  }, []);

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand-lockup">
          <span className="brand-mark" aria-hidden="true">
            +
          </span>
          <h1>Contrapt!</h1>
        </div>
        <p className="level-label">
          <span>Atelier de niveau</span>
          <span className="level-mode">Éditeur libre</span>
        </p>
        <button className="icon-button" type="button" aria-label="Ouvrir le menu">
          <span aria-hidden="true">☰</span>
        </button>
      </header>

      <main className="app-main">
        <section className="workspace" aria-label="Espace de construction">
          <div className="workspace-toolbar" aria-label="Actions de construction">
            <button
              className="toolbar-button"
              type="button"
              disabled={session.history.past.length === 0}
              onClick={() => {
                const result = undoEditorCommand(session);
                updateSession(result.session);
              }}
            >
              <span aria-hidden="true">↶</span>
              Annuler
            </button>
            <button
              className="toolbar-button"
              type="button"
              disabled={session.history.future.length === 0}
              onClick={() => {
                const result = redoEditorCommand(session);
                updateSession(result.session);
              }}
            >
              <span aria-hidden="true">↷</span>
              Rétablir
            </button>
            <button className="primary-button" type="button" disabled>
              <span aria-hidden="true">▶</span>
              Tester
            </button>
          </div>

          <div
            className="scene-frame"
            role="region"
            aria-label="Plateau de jeu"
            onPointerDown={(event) => {
              if (placementToolRef.current === null) return;
              const pointerId = pointerIdFromEvent(event.pointerId);
              if (activePointer.current !== null) {
                if (activePointer.current.id !== pointerId) {
                  cancelPlacementProjection();
                  setFeedback('Placement annulé : un second doigt a interrompu le geste.');
                }
                return;
              }

              const point = { x: event.clientX, y: event.clientY };
              if (!hasFiniteCoordinates(point)) {
                hasValidPlacementPreview.current = false;
                setFeedback(unavailablePositionMessage);
                return;
              }
              if (!hasUsableZoom(placementZoom)) {
                hasValidPlacementPreview.current = false;
                setFeedback(unavailableViewportMessage);
                return;
              }

              activePointer.current = { id: pointerId };
              if (
                pointerId !== null &&
                typeof event.currentTarget.setPointerCapture === 'function'
              ) {
                try {
                  event.currentTarget.setPointerCapture(pointerId);
                  capturedPointerId.current = pointerId;
                } catch {
                  // Capture is a progressive enhancement; the gesture still works without it.
                }
              }
              placeAt(point, event.currentTarget.getBoundingClientRect());
            }}
            onPointerUp={(event) => {
              const pointerId = pointerIdFromEvent(event.pointerId);
              if (!isActivePointer(activePointer.current, pointerId)) return;
              activePointer.current = null;
              if (pointerId !== null) releasePointerCapture(event.currentTarget, pointerId);
              commitPlacement();
            }}
            onPointerMove={(event) => {
              const pointerId = pointerIdFromEvent(event.pointerId);
              if (!isActivePointer(activePointer.current, pointerId)) return;

              placeAt(
                { x: event.clientX, y: event.clientY },
                event.currentTarget.getBoundingClientRect(),
              );
            }}
            onPointerCancel={(event) => {
              const pointerId = pointerIdFromEvent(event.pointerId);
              if (!isActivePointer(activePointer.current, pointerId)) return;
              activePointer.current = null;
              if (pointerId !== null) releasePointerCapture(event.currentTarget, pointerId);
              cancelPlacementProjection();
              setFeedback('Placement annulé : le geste tactile a été interrompu.');
            }}
            onLostPointerCapture={(event) => {
              const pointerId = pointerIdFromEvent(event.pointerId);
              capturedPointerId.current = null;
              if (!isActivePointer(activePointer.current, pointerId)) return;
              cancelPlacementProjection();
              setFeedback('Placement annulé : le geste tactile a été interrompu.');
            }}
          >
            <div className="scene-grid" aria-hidden="true" />
            <div className="scene-copy">
              <span className="scene-kicker">Éditeur · zone de construction</span>
              <strong>Préparez votre machine</strong>
              <span>Le plateau est prêt pour votre prochaine construction.</span>
            </div>
            <div className="scene-ground" aria-hidden="true" />
            {placementTool !== null && (
              <div className="placement-status" aria-live="polite">
                Placement actif : {placementTool.kind}.
                <button
                  className="placement-cancel"
                  type="button"
                  onClick={() => {
                    cancelPlacementProjection();
                    updatePlacementTool(null);
                    setFeedback(null);
                  }}
                >
                  Annuler le placement
                </button>
              </div>
            )}
            {feedback !== null && (
              <p className="placement-feedback" aria-live="assertive">
                {feedback}
              </p>
            )}
          </div>

          <div className="camera-controls" aria-label="Cadrage du plateau">
            <button className="camera-button" type="button" aria-label="Zoom arrière">
              −
            </button>
            <button className="camera-button camera-reset" type="button">
              Ajuster à la scène
            </button>
            <button className="camera-button" type="button" aria-label="Zoom avant">
              +
            </button>
          </div>
        </section>

        {isDrawerOpen && !isSideLayout && placementTool === null && (
          <button
            className="drawer-scrim"
            type="button"
            aria-label="Fermer le catalogue"
            onClick={() => {
              setIsDrawerOpen(false);
            }}
          />
        )}

        <section
          className={`object-drawer${drawerIsExpanded ? '' : ' object-drawer-collapsed'}`}
          aria-label="Objets disponibles"
        >
          <div className="drawer-handle" aria-hidden="true" />
          <div className="drawer-heading">
            <div>
              <span className="eyebrow">Catalogue</span>
              <h2>Objets disponibles</h2>
            </div>
            <span className="object-count">4 familles</span>
            <button
              className="drawer-toggle"
              type="button"
              aria-controls="object-list"
              aria-expanded={drawerIsExpanded}
              aria-label={drawerIsExpanded ? 'Replier le catalogue' : 'Ouvrir le catalogue'}
              onClick={() => {
                setIsDrawerOpen((current) => !current);
              }}
            >
              <span aria-hidden="true">{drawerIsExpanded ? '⌄' : '⌃'}</span>
            </button>
          </div>

          <div className="drawer-content">
            <div className="object-list" id="object-list" hidden={!drawerIsExpanded}>
              {objectKinds.map(({ kind, description }) => (
                <button
                  className={`object-card${selectedObject === kind ? ' object-card-selected' : ''}`}
                  key={kind}
                  type="button"
                  aria-pressed={selectedObject === kind}
                  onClick={() => {
                    activatePlacement(kind);
                  }}
                >
                  <span
                    className={`object-shape object-shape-${kind.toLowerCase()}`}
                    aria-hidden="true"
                  >
                    <span />
                  </span>
                  <span className="object-card-copy">
                    <strong>{kind}</strong>
                    <span>{description}</span>
                  </span>
                  <span className="object-card-action" aria-hidden="true">
                    {selectedObject === kind ? '✓' : '+'}
                  </span>
                </button>
              ))}
            </div>

            <p className="drawer-hint" aria-live="polite" hidden={!drawerIsExpanded}>
              {selectedObject === undefined
                ? 'Touchez un objet pour le sélectionner.'
                : `Objet sélectionné : ${selectedObject}.`}
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}

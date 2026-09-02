import { useEffect, useRef, useState, useSyncExternalStore } from 'react';

import {
  createConstructionAttempt,
  movePlacement,
  placeFromInventory,
  removePlacement,
  rotatePlacement,
} from '../application/construction/construction-attempt';
import {
  beginEditorManipulation,
  cancelEditorManipulation,
  commitEditorManipulation,
  createEditorSession,
  previewEditorManipulation,
  redoEditorCommand,
  resetSimulation,
  pauseSimulation,
  resumeSimulation,
  startSimulation,
  completeSimulation,
  undoEditorCommand,
  currentEditorAttempt,
  executeEditorCommand,
  selectEditorPlacement,
  type EditorSession,
} from '../application/editor-session/editor-session';
import { embeddedLevels } from '../content/embedded-levels';
import { levelDocumentSchema, type LevelDocument } from '../domain/level-document';
import {
  createBoardRenderer,
  projectLevel,
  type BoardCanvasContext,
} from '../presentation/board-renderer';
import {
  createImageBitmapSpriteDecoder,
  createSpriteLoader,
  type DecodedSprite,
  type SpriteDecoder,
  type SpriteLoader,
} from '../presentation/sprite-loader';
import {
  createSimulationSession,
  type SimulationBodyState,
  type SimulationSession,
  type SimulationSnapshot,
} from '../simulation/simulation-session';
import { screenPointToWorld, type BoardOffset, type ScreenPoint } from './screen-point-to-world';

type ObjectKind = 'Balle' | 'Panier' | 'Poutre' | 'Bascule';

interface PlacementTool {
  readonly kind: ObjectKind;
  readonly inventoryEntryId: string;
  readonly placementId: string;
}

interface PlacementPreview {
  readonly kind: ObjectKind;
  readonly screenPosition: ScreenPoint;
  readonly worldPosition: ScreenPoint;
  readonly isValid: boolean;
  readonly revision: number;
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
  schemaVersion: 2,
  id: 'free-workshop',
  metadata: { title: 'Atelier de niveau' },
  scene: { min: { x: 0, y: 0 }, max: { x: 16, y: 9 } },
  objects: [
    {
      id: 'workshop-floor',
      type: 'beam',
      props: { size: 'long' },
      transform: { position: { x: 8, y: 8 }, rotation: 0 },
      permissions: { move: false, rotate: false, remove: false },
    },
    {
      id: 'goal-ball',
      type: 'ball',
      props: {},
      transform: { position: { x: 8, y: 1 }, rotation: 0 },
      permissions: { move: false, rotate: false, remove: false },
    },
    {
      id: 'goal-basket',
      type: 'basket',
      props: {},
      transform: { position: { x: 12, y: 7 }, rotation: 0 },
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
  buildZones: [{ min: { x: 0, y: 0 }, max: { x: 16, y: 9 } }],
});

const initialSession = (): EditorSession =>
  createEditorSession('creation', createConstructionAttempt(workshopDocument));

const refusalMessage = (reason: string): string =>
  reason === 'outside-build-zone'
    ? 'Placement refusé : choisissez une position dans la zone de construction.'
    : 'Placement refusé : cette action est indisponible.';

const unavailablePositionMessage = 'Placement refusé : la position tactile est indisponible.';
const unavailableViewportMessage = 'Placement refusé : le cadrage du plateau est indisponible.';
interface CameraState {
  readonly origin: ScreenPoint;
  readonly pixelsPerWorldUnit: number;
}

const initialCamera: CameraState = { origin: { x: 0, y: 0 }, pixelsPerWorldUnit: 48 };
const cameraZoomFactor = 1.25;
/** ADR 0007 - Caméra : « contain » du rectangle de scène avec 4 % de marge. */
const sceneFitMargin = 0.96;

const fitCameraToScene = (
  scene: LevelDocument['scene'],
  cssWidth: number,
  cssHeight: number,
): CameraState => {
  const sceneWidth = scene.max.x - scene.min.x;
  const sceneHeight = scene.max.y - scene.min.y;
  if (cssWidth <= 0 || cssHeight <= 0 || sceneWidth <= 0 || sceneHeight <= 0) return initialCamera;

  const pixelsPerWorldUnit =
    Math.min(cssWidth / sceneWidth, cssHeight / sceneHeight) * sceneFitMargin;

  return {
    pixelsPerWorldUnit,
    origin: {
      x: (scene.min.x + scene.max.x) / 2 - cssWidth / 2 / pixelsPerWorldUnit,
      y: (scene.min.y + scene.max.y) / 2 - cssHeight / 2 / pixelsPerWorldUnit,
    },
  };
};
const fixedStepSeconds = 1 / 60;

const hasFiniteCoordinates = (point: ScreenPoint): boolean =>
  Number.isFinite(point.x) && Number.isFinite(point.y);

const hasUsableZoom = (zoom: number): boolean => Number.isFinite(zoom) && zoom > 0;

const placementPreviewFromPointer = (
  kind: ObjectKind,
  point: ScreenPoint,
  boardRect: BoardOffset,
  pixelsPerWorldUnit: number,
  origin: ScreenPoint,
  isValid: boolean,
): Omit<PlacementPreview, 'revision'> | null => {
  if (!hasFiniteCoordinates(point) || !hasUsableZoom(pixelsPerWorldUnit)) return null;

  return {
    kind,
    screenPosition: {
      x: point.x - boardRect.left,
      y: point.y - boardRect.top,
    },
    worldPosition: screenPointToWorld(point, boardRect, pixelsPerWorldUnit, origin),
    isValid,
  };
};

const pointerIdFromEvent = (pointerId: unknown): number | null =>
  typeof pointerId === 'number' && Number.isFinite(pointerId) ? pointerId : null;

const isActivePointer = (
  activePointer: { readonly id: number | null } | null,
  pointerId: number | null,
): boolean =>
  activePointer !== null && (activePointer.id === null || activePointer.id === pointerId);

const shouldReplaceSimulationBody = (
  current: SimulationBodyState | undefined,
  candidate: SimulationBodyState,
): boolean => current === undefined || candidate.role === 'board' || current.role === 'base';

/**
 * Creates the render-only projection of a running simulation. The editor
 * snapshot remains untouched and the physics adapter remains outside the
 * domain/presentation boundary.
 */
const projectSimulationDocument = (
  document: LevelDocument,
  simulation: SimulationSnapshot,
): LevelDocument => {
  const bodiesByPlacementId = new Map<string, SimulationBodyState>();
  for (const body of simulation.bodies) {
    const current = bodiesByPlacementId.get(body.placementId);
    if (shouldReplaceSimulationBody(current, body)) {
      bodiesByPlacementId.set(body.placementId, body);
    }
  }

  return {
    ...document,
    objects: document.objects.map((object) => {
      const body = bodiesByPlacementId.get(object.id);
      if (body === undefined) return object;

      return {
        ...object,
        transform: {
          position: { ...body.position },
          rotation: body.rotation,
        },
      };
    }),
  };
};

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

const isImageBitmapSource = (source: unknown): source is ImageBitmap =>
  typeof ImageBitmap !== 'undefined' && source instanceof ImageBitmap;

const createCanvasSpriteDecoder = (): SpriteDecoder | null => {
  if (typeof fetch !== 'function' || typeof globalThis.createImageBitmap !== 'function') {
    return null;
  }

  const decode = createImageBitmapSpriteDecoder<Blob, ImageBitmap>({
    fetchAsset: (path) => fetch(path),
    createImageBitmap: async (blob) => {
      const source = await globalThis.createImageBitmap(blob);
      return { width: source.width, height: source.height, source };
    },
  });

  return async (path: string): Promise<DecodedSprite> => {
    const sprite = await decode(path);
    if (!isImageBitmapSource(sprite.source)) {
      throw new Error(`Le sprite « ${path} » n'est pas un bitmap exploitable.`);
    }

    return {
      width: sprite.width,
      height: sprite.height,
      source: sprite.source,
    };
  };
};

const createCanvasContextAdapter = (context: CanvasRenderingContext2D): BoardCanvasContext => ({
  save: () => {
    context.save();
  },
  restore: () => {
    context.restore();
  },
  setTransform: (horizontalScale, verticalSkew, horizontalSkew, verticalScale, x, y) => {
    context.setTransform(horizontalScale, verticalSkew, horizontalSkew, verticalScale, x, y);
  },
  translate: (x, y) => {
    context.translate(x, y);
  },
  rotate: (radians) => {
    context.rotate(radians);
  },
  drawImage: (source, x, y, width, height) => {
    if (!isImageBitmapSource(source)) {
      throw new Error('Le renderer a reçu une source de sprite non exploitable.');
    }

    context.drawImage(source, x, y, width, height);
  },
});

export function App() {
  const [placementTool, setPlacementTool] = useState<PlacementTool | null>(null);
  const [placementPreview, setPlacementPreview] = useState<PlacementPreview | null>(null);
  const [session, setSession] = useState<EditorSession>(initialSession);
  const [simulationState, setSimulationState] = useState<SimulationSnapshot | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [camera, setCamera] = useState(initialCamera);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLevelListOpen, setIsLevelListOpen] = useState(false);
  const [hasWon, setHasWon] = useState(false);
  const nextPlacementNumber = useRef(1);
  const boardCanvasRef = useRef<HTMLCanvasElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const spriteLoaderRef = useRef<SpriteLoader | null>(null);
  const boardRenderRef = useRef<(() => void) | null>(null);
  const boardRenderQueueRef = useRef<Promise<void>>(Promise.resolve());
  const sessionRef = useRef(session);
  const simulationStateRef = useRef<SimulationSnapshot | null>(null);
  const simulationSessionRef = useRef<SimulationSession | null>(null);
  const simulationAnimationFrameRef = useRef<number | null>(null);
  const simulationTimestampRef = useRef<number | null>(null);
  const placementPreviewRevisionRef = useRef(0);
  const placementToolRef = useRef<PlacementTool | null>(placementTool);
  const cameraRef = useRef(camera);
  const hasValidPlacementPreview = useRef(false);
  const activePointer = useRef<{ readonly id: number | null } | null>(null);
  const capturedPointerId = useRef<number | null>(null);
  const activeMovePointer = useRef<{
    readonly id: number | null;
    readonly placementId: string;
  } | null>(null);
  const isSideLayout = useSyncExternalStore(
    subscribeToSideLayout,
    getSideLayoutSnapshot,
    () => false,
  );
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const drawerIsExpanded = isDrawerOpen || isSideLayout;
  const selectedObject = placementTool?.kind;
  const simulationBallId = session.simulationSnapshot?.document.goal.ballId;
  const simulationBall = simulationState?.bodies.find(
    (body) => body.placementId === simulationBallId && body.role === 'primary',
  );
  const displayedAttempt = currentEditorAttempt(session);
  const selectedPlacement = displayedAttempt.document.objects.find(
    (object) => object.id === session.selectedPlacementId,
  );
  const placementName = (object: LevelDocument['objects'][number]): string =>
    object.type === 'ball'
      ? 'Balle'
      : object.type === 'basket'
        ? 'Panier'
        : object.type === 'beam'
          ? 'Poutre'
          : 'Bascule';
  const loadLevelOne = (): void => {
    const levelOne = embeddedLevels[0];
    if (levelOne === undefined) {
      setFeedback('Le niveau 1 embarqué est indisponible.');
      return;
    }
    disposeSimulationSession();
    updateSession(createEditorSession('resolution', createConstructionAttempt(levelOne)));
    updatePlacementTool(null);
    setPlacementPreview(null);
    setHasWon(false);
    setIsMenuOpen(false);
    setIsLevelListOpen(false);
    fitCameraToCurrentScene();
  };
  const returnToLevels = (): void => {
    disposeSimulationSession();
    setHasWon(false);
    setIsMenuOpen(true);
    setIsLevelListOpen(true);
  };
  const updateSession = (nextSession: EditorSession): void => {
    sessionRef.current = nextSession;
    setSession(nextSession);
  };
  const updatePlacementTool = (nextTool: PlacementTool | null): void => {
    placementToolRef.current = nextTool;
    setPlacementTool(nextTool);
  };
  const updateSimulationState = (nextState: SimulationSnapshot | null): void => {
    simulationStateRef.current = nextState;
    setSimulationState(nextState);
  };
  const updateCamera = (nextCamera: CameraState): void => {
    cameraRef.current = nextCamera;
    setCamera(nextCamera);
  };

  const fitCameraToCurrentScene = (): void => {
    const canvas = boardCanvasRef.current;
    if (canvas === null) return;

    const bounds = canvas.getBoundingClientRect();
    if (bounds.width <= 0 || bounds.height <= 0) return;

    updateCamera(
      fitCameraToScene(
        currentEditorAttempt(sessionRef.current).document.scene,
        bounds.width,
        bounds.height,
      ),
    );
  };

  const cancelSimulationFrame = (): void => {
    const frameId = simulationAnimationFrameRef.current;
    if (frameId === null) return;

    if (typeof cancelAnimationFrame === 'function') {
      cancelAnimationFrame(frameId);
    }
    simulationAnimationFrameRef.current = null;
  };

  const disposeSimulationSession = (): void => {
    cancelSimulationFrame();
    simulationTimestampRef.current = null;
    const physicalSession = simulationSessionRef.current;
    simulationSessionRef.current = null;
    if (physicalSession !== null) physicalSession.destroy();
    updateSimulationState(null);
  };

  const scheduleSimulationFrame = (): void => {
    if (
      sessionRef.current.phase !== 'running' ||
      simulationSessionRef.current === null ||
      typeof requestAnimationFrame !== 'function'
    ) {
      return;
    }

    simulationAnimationFrameRef.current = requestAnimationFrame((timestamp) => {
      simulationAnimationFrameRef.current = null;
      const physicalSession = simulationSessionRef.current;
      if (physicalSession === null || sessionRef.current.phase !== 'running') return;

      const previousTimestamp = simulationTimestampRef.current;
      simulationTimestampRef.current = timestamp;
      const elapsedSeconds =
        previousTimestamp === null ? 0 : Math.max(0, timestamp - previousTimestamp) / 1000;

      physicalSession.advanceElapsedSeconds(elapsedSeconds);
      const nextState = physicalSession.readState();
      updateSimulationState(nextState);

      if (physicalSession.readGoalEvaluation().status === 'succeeded') {
        const completed = completeSimulation(sessionRef.current);
        if (completed.status === 'accepted') {
          updateSession(completed.session);
          setHasWon(true);
          simulationTimestampRef.current = null;
          return;
        }
      }

      scheduleSimulationFrame();
    });
  };

  const launchSimulation = (): void => {
    const result = startSimulation(sessionRef.current);
    if (result.status === 'rejected') {
      setFeedback('Simulation indisponible : revenez à la construction pour la relancer.');
      return;
    }

    const simulationSnapshot = result.session.simulationSnapshot;
    if (simulationSnapshot === null) {
      setFeedback('Simulation indisponible : le snapshot du niveau est absent.');
      return;
    }

    let physicalSession: SimulationSession;
    try {
      physicalSession = createSimulationSession(simulationSnapshot.document, {
        fixedStepSeconds,
      });
    } catch {
      setFeedback('Simulation indisponible : le niveau ne peut pas être simulé.');
      return;
    }

    disposeSimulationSession();
    simulationSessionRef.current = physicalSession;
    simulationTimestampRef.current = null;
    updateSimulationState(physicalSession.readState());
    updateSession(result.session);
    updatePlacementTool(null);
    setPlacementPreview(null);
    hasValidPlacementPreview.current = false;
    activePointer.current = null;
    capturedPointerId.current = null;
    setFeedback(null);
    setHasWon(false);
    scheduleSimulationFrame();
  };

  const restoreConstruction = (): void => {
    const result = resetSimulation(sessionRef.current);
    if (result.status === 'rejected') {
      setFeedback('Retour à la construction indisponible pour cette simulation.');
      return;
    }

    disposeSimulationSession();
    updateSession(result.session);
    setPlacementPreview(null);
    hasValidPlacementPreview.current = false;
    activePointer.current = null;
    capturedPointerId.current = null;
    setFeedback(null);
  };

  const pauseCurrentSimulation = (): void => {
    const result = pauseSimulation(sessionRef.current);
    if (result.status === 'rejected') {
      setFeedback('Pause indisponible : la simulation n’est pas en cours.');
      return;
    }

    cancelSimulationFrame();
    simulationTimestampRef.current = null;
    updateSession(result.session);
    setFeedback(null);
  };

  const resumeCurrentSimulation = (): void => {
    const result = resumeSimulation(sessionRef.current);
    if (result.status === 'rejected') {
      setFeedback('Reprise indisponible : la simulation n’est pas en pause.');
      return;
    }

    simulationTimestampRef.current = null;
    updateSession(result.session);
    setFeedback(null);
    scheduleSimulationFrame();
  };

  const cancelPlacementProjection = (): void => {
    const result = cancelEditorManipulation(sessionRef.current);
    if (result.status === 'accepted') {
      updateSession(result.session);
    }
    hasValidPlacementPreview.current = false;
    activePointer.current = null;
    setPlacementPreview(null);
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
    setPlacementPreview(null);
    hasValidPlacementPreview.current = false;
    activePointer.current = null;
    capturedPointerId.current = null;
    setIsDrawerOpen(false);
    setFeedback(null);
  };

  const setPlacementIndicator = (
    kind: ObjectKind,
    point: ScreenPoint,
    boardRect: BoardOffset,
    isValid: boolean,
  ): void => {
    const preview = placementPreviewFromPointer(
      kind,
      point,
      boardRect,
      cameraRef.current.pixelsPerWorldUnit,
      cameraRef.current.origin,
      isValid,
    );
    if (preview === null) {
      setPlacementPreview(null);
      return;
    }

    placementPreviewRevisionRef.current += 1;
    setPlacementPreview({ ...preview, revision: placementPreviewRevisionRef.current });
  };

  const placeAt = (point: ScreenPoint, boardRect: BoardOffset): void => {
    const activeTool = placementToolRef.current;
    if (activeTool === null) return;

    if (!hasFiniteCoordinates(point)) {
      hasValidPlacementPreview.current = false;
      setPlacementPreview(null);
      setFeedback(unavailablePositionMessage);
      return;
    }
    if (!hasUsableZoom(cameraRef.current.pixelsPerWorldUnit)) {
      hasValidPlacementPreview.current = false;
      setPlacementPreview(null);
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

    const worldPosition = screenPointToWorld(
      point,
      boardRect,
      cameraRef.current.pixelsPerWorldUnit,
      cameraRef.current.origin,
    );

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
    const isValid = result.status === 'accepted';
    setPlacementIndicator(activeTool.kind, point, boardRect, isValid);
    hasValidPlacementPreview.current = isValid;
    if (!isValid) setFeedback(refusalMessage(result.reason));
  };

  const updatePlacementIndicator = (point: ScreenPoint, boardRect: BoardOffset): void => {
    const activeTool = placementToolRef.current;
    if (activeTool === null) return;

    placeAt(point, boardRect);
  };

  const commitPlacement = (): void => {
    if (placementToolRef.current === null || !hasValidPlacementPreview.current) return;

    const result = commitEditorManipulation(sessionRef.current);
    updateSession(result.session);
    if (result.status === 'accepted') {
      updatePlacementTool(null);
      hasValidPlacementPreview.current = false;
      setPlacementPreview(null);
      setFeedback(null);
    } else {
      setFeedback(refusalMessage(result.reason));
    }
  };

  const selectPlacement = (placementId: string): void => {
    updateSession(selectEditorPlacement(sessionRef.current, placementId));
  };

  const executeSelectedCommand = (command: Parameters<typeof executeEditorCommand>[1]): void => {
    const result = executeEditorCommand(sessionRef.current, command);
    updateSession(result.session);
    if (result.status === 'rejected') setFeedback(refusalMessage(result.reason));
  };

  const beginMove = (pointerId: number | null): void => {
    const placementId = sessionRef.current.selectedPlacementId;
    if (placementId === null) return;
    const result = beginEditorManipulation(sessionRef.current, { kind: 'move', placementId });
    if (result.status === 'rejected') {
      setFeedback(refusalMessage(result.reason));
      return;
    }
    updateSession(result.session);
    activeMovePointer.current = { id: pointerId, placementId };
  };

  const previewMove = (point: ScreenPoint): void => {
    const activeMove = activeMovePointer.current;
    const boardRect = boardRef.current?.getBoundingClientRect();
    if (activeMove === null || boardRect === undefined || !hasFiniteCoordinates(point)) return;
    const position = screenPointToWorld(
      point,
      boardRect,
      cameraRef.current.pixelsPerWorldUnit,
      cameraRef.current.origin,
    );
    const result = previewEditorManipulation(
      sessionRef.current,
      movePlacement({
        context: sessionRef.current.mode === 'resolution' ? 'player' : 'author',
        placementId: activeMove.placementId,
        position,
      }),
    );
    updateSession(result.session);
    if (result.status === 'rejected') setFeedback(refusalMessage(result.reason));
  };

  const commitMove = (pointerId: number | null): void => {
    const activeMove = activeMovePointer.current;
    if (activeMove === null || (activeMove.id !== null && activeMove.id !== pointerId)) return;
    activeMovePointer.current = null;
    const result = commitEditorManipulation(sessionRef.current);
    updateSession(result.session);
    if (result.status === 'rejected') setFeedback(refusalMessage(result.reason));
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
      setPlacementPreview(null);
      setFeedback('Placement annulé : le cadrage du plateau a changé.');
    };

    window.addEventListener('resize', cancelForLayoutChange);
    window.addEventListener('orientationchange', cancelForLayoutChange);
    return () => {
      window.removeEventListener('resize', cancelForLayoutChange);
      window.removeEventListener('orientationchange', cancelForLayoutChange);
    };
  }, []);

  useEffect(
    () => () => {
      const frameId = simulationAnimationFrameRef.current;
      if (frameId !== null && typeof cancelAnimationFrame === 'function') {
        cancelAnimationFrame(frameId);
      }
      simulationAnimationFrameRef.current = null;
      simulationTimestampRef.current = null;

      const physicalSession = simulationSessionRef.current;
      simulationSessionRef.current = null;
      if (physicalSession !== null) physicalSession.destroy();
    },
    [],
  );

  useEffect(() => {
    const canvas = boardCanvasRef.current;
    const decode = createCanvasSpriteDecoder();
    if (canvas === null || decode === null) return;

    const context = canvas.getContext('2d');
    if (context === null) return;

    const spriteLoader = spriteLoaderRef.current ?? createSpriteLoader({ scale: 2, decode });
    spriteLoaderRef.current = spriteLoader;
    let isMounted = true;
    const render = (): void => {
      boardRenderQueueRef.current = boardRenderQueueRef.current
        .catch(() => undefined)
        .then(async () => {
          if (!isMounted) return;

          const bounds = canvas.getBoundingClientRect();
          if (bounds.width <= 0 || bounds.height <= 0) return;

          const renderer = createBoardRenderer({
            canvas,
            context: createCanvasContextAdapter(context),
            viewport: {
              cssWidth: bounds.width,
              cssHeight: bounds.height,
              origin: cameraRef.current.origin,
              pixelsPerWorldUnit: cameraRef.current.pixelsPerWorldUnit,
              devicePixelRatio: window.devicePixelRatio > 0 ? window.devicePixelRatio : 1,
            },
            spriteLoader,
          });

          const currentSession = sessionRef.current;
          const simulation = simulationStateRef.current;
          const simulationAttempt = currentSession.simulationSnapshot;
          const displayedDocument =
            simulationAttempt !== null && simulation !== null
              ? projectSimulationDocument(simulationAttempt.document, simulation)
              : (simulationAttempt ?? currentEditorAttempt(currentSession)).document;
          await renderer.render(projectLevel(displayedDocument));
        })
        .catch(() => undefined);
    };

    boardRenderRef.current = render;
    window.addEventListener('resize', render);
    window.addEventListener('orientationchange', render);
    return () => {
      isMounted = false;
      if (boardRenderRef.current === render) boardRenderRef.current = null;
      window.removeEventListener('resize', render);
      window.removeEventListener('orientationchange', render);
    };
  }, []);

  useEffect(() => {
    fitCameraToCurrentScene();
    window.addEventListener('resize', fitCameraToCurrentScene);
    window.addEventListener('orientationchange', fitCameraToCurrentScene);
    return () => {
      window.removeEventListener('resize', fitCameraToCurrentScene);
      window.removeEventListener('orientationchange', fitCameraToCurrentScene);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- cadrage initial et sur changement de viewport, l'état courant est lu par refs
  }, []);

  useEffect(() => {
    boardRenderRef.current?.();
  }, [session, simulationState, camera]);

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
          <span>
            {session.mode === 'creation' ? 'Éditeur de niveaux' : 'Niveau 1 · Laisser tomber'}
          </span>
          <span className="level-mode">
            {session.mode === 'creation' ? 'Mode éditeur' : 'Mode joueur'}
          </span>
        </p>
        <button
          className="icon-button"
          type="button"
          aria-label="Ouvrir le menu"
          aria-expanded={isMenuOpen}
          onClick={() => {
            setIsMenuOpen((open) => !open);
            setIsLevelListOpen((open) => !isMenuOpen && !open);
          }}
        >
          <span aria-hidden="true">☰</span>
        </button>
      </header>

      <main className="app-main">
        {isMenuOpen && (
          <section className="level-menu" aria-label="Menu principal">
            <button
              type="button"
              className="context-action"
              onClick={() => {
                setIsLevelListOpen(true);
              }}
            >
              Liste des niveaux
            </button>
            {isLevelListOpen && (
              <section className="level-list" aria-label="Liste des niveaux">
                <p>Niveau 1 · Laisser tomber</p>
                <button type="button" className="primary-button" onClick={loadLevelOne}>
                  Lancer le niveau 1
                </button>
              </section>
            )}
          </section>
        )}
        <section className="workspace" aria-label="Espace de construction">
          {session.mode === 'resolution' && (
            <section className="level-objective" aria-label="Objectif du niveau">
              Faire entrer la balle dans le panier
            </section>
          )}
          <div
            className="workspace-toolbar"
            aria-label={
              session.phase === 'construction' ? 'Actions de construction' : 'Actions de simulation'
            }
          >
            {session.phase === 'construction' && (
              <>
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
                {placementTool !== null && (
                  <div className="toolbar-status" aria-live="polite">
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
                <button className="primary-button" type="button" onClick={launchSimulation}>
                  <span aria-hidden="true">▶</span>
                  Tester
                </button>
              </>
            )}

            {session.phase !== 'construction' && (
              <div className="toolbar-status" aria-live="polite">
                <strong>
                  {session.phase === 'running'
                    ? 'Simulation en cours'
                    : session.phase === 'paused'
                      ? 'Simulation en pause'
                      : 'Simulation terminée'}
                </strong>
                {session.phase === 'running' && (
                  <button
                    className="placement-cancel"
                    type="button"
                    onClick={pauseCurrentSimulation}
                  >
                    Mettre en pause
                  </button>
                )}
                {session.phase === 'paused' && (
                  <button
                    className="placement-cancel"
                    type="button"
                    onClick={resumeCurrentSimulation}
                  >
                    Reprendre
                  </button>
                )}
                <button className="placement-cancel" type="button" onClick={restoreConstruction}>
                  Réinitialiser
                </button>
              </div>
            )}

            {feedback !== null && (
              <p className="toolbar-feedback" aria-live="assertive">
                {feedback}
              </p>
            )}
          </div>

          <div
            className="scene-frame"
            ref={boardRef}
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
                setPlacementPreview(null);
                setFeedback(unavailablePositionMessage);
                return;
              }
              if (!hasUsableZoom(cameraRef.current.pixelsPerWorldUnit)) {
                hasValidPlacementPreview.current = false;
                setPlacementPreview(null);
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
              const point = { x: event.clientX, y: event.clientY };
              const boardRect = event.currentTarget.getBoundingClientRect();
              if (isActivePointer(activePointer.current, pointerId)) {
                placeAt(point, boardRect);
                return;
              }

              updatePlacementIndicator(point, boardRect);
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
            <canvas
              ref={boardCanvasRef}
              className="board-canvas"
              role="img"
              aria-label="Rendu du plateau"
              data-simulation-step={
                simulationState === null ? undefined : String(simulationState.fixedStep)
              }
              data-simulation-ball-position={
                simulationBall === undefined
                  ? undefined
                  : `${String(simulationBall.position.x)},${String(simulationBall.position.y)}`
              }
              data-camera-zoom={String(camera.pixelsPerWorldUnit)}
            />
            {placementPreview !== null && session.phase === 'construction' && (
              <div
                className={`placement-preview placement-preview-${placementPreview.kind.toLowerCase()}${
                  placementPreview.isValid ? '' : ' placement-preview-invalid'
                }`}
                role="img"
                aria-label={`Aperçu de placement : ${placementPreview.kind}`}
                data-position={`${String(placementPreview.worldPosition.x)},${String(
                  placementPreview.worldPosition.y,
                )}#${String(placementPreview.revision)}`}
                data-valid={placementPreview.isValid}
                style={{
                  left: `${String(placementPreview.screenPosition.x)}px`,
                  top: `${String(placementPreview.screenPosition.y)}px`,
                }}
              >
                <span aria-hidden="true" />
              </div>
            )}
            {placementPreview?.isValid === true && session.phase === 'construction' && (
              <p className="placement-preview-status" role="status">
                Aperçu de placement valide
              </p>
            )}
          </div>

          <div className="camera-controls" aria-label="Cadrage du plateau">
            <button
              className="camera-button"
              type="button"
              aria-label="Zoom arrière"
              onClick={() => {
                updateCamera({
                  ...cameraRef.current,
                  pixelsPerWorldUnit: cameraRef.current.pixelsPerWorldUnit / cameraZoomFactor,
                });
              }}
            >
              −
            </button>
            <button
              className="camera-button camera-reset"
              type="button"
              onClick={fitCameraToCurrentScene}
            >
              Ajuster à la scène
            </button>
            <button
              className="camera-button"
              type="button"
              aria-label="Zoom avant"
              onClick={() => {
                updateCamera({
                  ...cameraRef.current,
                  pixelsPerWorldUnit: cameraRef.current.pixelsPerWorldUnit * cameraZoomFactor,
                });
              }}
            >
              +
            </button>
          </div>

          <section className="scene-objects" aria-label="Objets de la scène">
            {displayedAttempt.document.objects.map((object) => {
              const objectAttributes = {
                className: 'scene-object',
                'data-position': `${String(object.transform.position.x)},${String(object.transform.position.y)}`,
                'data-rotation': String(object.transform.rotation),
              };
              const isEditablePlacement = displayedAttempt.provenance[object.id] !== undefined;
              return isEditablePlacement ? (
                <button
                  key={object.id}
                  type="button"
                  {...objectAttributes}
                  aria-pressed={session.selectedPlacementId === object.id}
                  onClick={() => {
                    selectPlacement(object.id);
                  }}
                >
                  {placementName(object)}
                </button>
              ) : (
                <span key={object.id} {...objectAttributes}>
                  {placementName(object)}
                </span>
              );
            })}
          </section>

          {selectedPlacement !== undefined && session.phase === 'construction' && (
            <section
              className="context-panel"
              aria-label={`Objet sélectionné : ${placementName(selectedPlacement)}`}
            >
              <strong>Objet sélectionné : {placementName(selectedPlacement)}</strong>
              {selectedPlacement.permissions.move && (
                <button
                  className="context-action"
                  type="button"
                  onPointerDown={(event) => {
                    beginMove(pointerIdFromEvent(event.pointerId));
                  }}
                  onPointerMove={(event) => {
                    previewMove({ x: event.clientX, y: event.clientY });
                  }}
                  onPointerUp={(event) => {
                    commitMove(pointerIdFromEvent(event.pointerId));
                  }}
                  onPointerCancel={() => {
                    activeMovePointer.current = null;
                    const cancelled = cancelEditorManipulation(sessionRef.current);
                    updateSession(cancelled.session);
                  }}
                >
                  Déplacer la {placementName(selectedPlacement).toLowerCase()}
                </button>
              )}
              {selectedPlacement.type === 'beam' && selectedPlacement.permissions.rotate && (
                <button
                  className="context-action"
                  type="button"
                  onClick={() => {
                    executeSelectedCommand(
                      rotatePlacement({
                        context: session.mode === 'resolution' ? 'player' : 'author',
                        placementId: selectedPlacement.id,
                        rotation: selectedPlacement.transform.rotation + Math.PI / 12,
                      }),
                    );
                  }}
                >
                  Tourner à droite
                </button>
              )}
              {selectedPlacement.permissions.remove && (
                <button
                  className="context-action"
                  type="button"
                  onClick={() => {
                    executeSelectedCommand(
                      removePlacement({
                        context: session.mode === 'resolution' ? 'player' : 'author',
                        placementId: selectedPlacement.id,
                      }),
                    );
                  }}
                >
                  Supprimer la {placementName(selectedPlacement).toLowerCase()}
                </button>
              )}
            </section>
          )}
        </section>

        {session.phase === 'result' && hasWon && (
          <section className="level-result" aria-label="Résultat du niveau">
            <strong>Victoire</strong>
            <button className="primary-button" type="button" onClick={loadLevelOne}>
              Rejouer le niveau
            </button>
            <button className="context-action" type="button" onClick={returnToLevels}>
              Retour aux niveaux
            </button>
          </section>
        )}

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
                  disabled={session.phase !== 'construction'}
                  aria-label={kind === 'Poutre' ? 'Poutre courte' : kind}
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

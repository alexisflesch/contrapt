import { useEffect, useRef, type RefObject } from 'react';

import {
  currentEditorAttempt,
  type EditorSession,
} from '../application/editor-session/editor-session';
import type { LevelDocument } from '../domain/level-document';
import type { BoardPointerHandlers, PlacementPreview } from '../app/use-board-pointers';
import {
  createBoardRenderer,
  projectLevel,
  type BoardCanvasContext,
} from '../presentation/board-renderer';
import type { Camera } from '../presentation/board-camera';
import {
  createImageBitmapSpriteDecoder,
  createSpriteLoader,
  type DecodedSprite,
  type SpriteDecoder,
  type SpriteLoader,
} from '../presentation/sprite-loader';
import {
  type SimulationBodyState,
  type SimulationSnapshot,
} from '../simulation/simulation-session';

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

interface BoardViewProps {
  readonly session: EditorSession;
  readonly simulationState: SimulationSnapshot | null;
  readonly camera: Camera;
  readonly sessionRef: RefObject<EditorSession>;
  readonly simulationStateRef: RefObject<SimulationSnapshot | null>;
  readonly cameraRef: RefObject<Camera>;
  readonly boardCanvasRef: RefObject<HTMLCanvasElement | null>;
  readonly placementPreview: PlacementPreview | null;
  readonly boardPointerHandlers: BoardPointerHandlers;
  readonly onZoomIn: () => void;
  readonly onZoomOut: () => void;
  readonly onFitToScene: () => void;
}

/**
 * The board itself: the canvas and its sprite-pipeline rendering (ADR 0006,
 * ADR 0007), the placement-preview overlay, and the camera zoom controls.
 * B1 (plan-remise-en-jeu.md § 4) removed the debug "scene objects" pip list
 * that used to sit under the canvas — a leftover pre-A5 inspection layer, not
 * part of the player-facing UI. Tests that need to read or select a placed
 * object now go through the canvas's own `data-*` attributes; on-canvas
 * selection is C3's job.
 */
export function BoardView({
  session,
  simulationState,
  camera,
  sessionRef,
  simulationStateRef,
  cameraRef,
  boardCanvasRef,
  placementPreview,
  boardPointerHandlers,
  onZoomIn,
  onZoomOut,
  onFitToScene,
}: BoardViewProps) {
  const boardRef = useRef<HTMLDivElement>(null);
  const spriteLoaderRef = useRef<SpriteLoader | null>(null);
  const boardRenderRef = useRef<(() => void) | null>(null);
  const boardRenderQueueRef = useRef<Promise<void>>(Promise.resolve());

  const simulationBallId = session.simulationSnapshot?.document.goal.ballId;
  const simulationBall = simulationState?.bodies.find(
    (body) => body.placementId === simulationBallId && body.role === 'primary',
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
    // `sessionRef`, `boardCanvasRef`, `cameraRef` and `simulationStateRef`
    // come from hooks (`useEditorSession`, `useBoardCamera`,
    // `useSimulationRunner`): each is a plain `useRef` internally, so it is
    // referentially stable across renders even though eslint cannot see that
    // through the hook boundary. Listing them here does not make this effect
    // (re)subscribe any more often — it still only runs once per mount.
  }, [sessionRef, boardCanvasRef, cameraRef, simulationStateRef]);

  useEffect(() => {
    boardRenderRef.current?.();
  }, [session, simulationState, camera]);

  return (
    <>
      <div
        className="scene-frame"
        ref={boardRef}
        role="region"
        aria-label="Plateau de jeu"
        {...boardPointerHandlers}
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
          onClick={onZoomOut}
        >
          −
        </button>
        <button className="camera-button camera-reset" type="button" onClick={onFitToScene}>
          Ajuster à la scène
        </button>
        <button className="camera-button" type="button" aria-label="Zoom avant" onClick={onZoomIn}>
          +
        </button>
      </div>
    </>
  );
}

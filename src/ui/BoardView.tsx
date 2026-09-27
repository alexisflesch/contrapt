import { useEffect, useRef, type RefObject } from 'react';

import {
  currentEditorAttempt,
  type EditorSession,
} from '../application/editor-session/editor-session';
import type { BoardPointerHandlers, PlacementPreview } from '../app/use-board-pointers';
import {
  createBoardRenderer,
  projectLevel,
  type BoardCanvasContext,
  type BoardDeviceView,
  type BoardSimulationView,
} from '../presentation/board-renderer';
import type { Camera } from '../presentation/board-camera';
import {
  createImageBitmapSpriteDecoder,
  createSpriteLoader,
  type DecodedSprite,
  type SpriteDecoder,
  type SpriteLoader,
} from '../presentation/sprite-loader';
import { type SimulationSnapshot } from '../simulation/simulation-session';

/**
 * Collects what a running simulation moves — the ball, the seesaw's board,
 * a lever's handle, a conveyor's belt, a button's cap, a fan's blades, a
 * barrier's bar, a springboard's spring. The simulated document itself is
 * never rewritten: static parts keep reading their placement.
 */
const simulationView = (simulation: SimulationSnapshot): BoardSimulationView => ({
  bodyPoses: new Map(
    simulation.bodies
      .filter((body) => body.role !== 'base')
      .map((body) => [body.placementId, { position: body.position, rotation: body.rotation }]),
  ),
  conveyorBelts: new Map(
    simulation.devices.flatMap((device) =>
      device.kind === 'conveyor'
        ? [[device.placementId, { offset: device.beltOffset, facing: device.facing }] as const]
        : [],
    ),
  ),
  devices: new Map(
    simulation.devices.flatMap((device): (readonly [string, BoardDeviceView])[] => {
      switch (device.kind) {
        case 'button':
          return [[device.placementId, { kind: 'button', pressed: device.pressed }]];
        case 'fan':
          return [[device.placementId, { kind: 'fan', bladeAngle: device.bladeAngle }]];
        case 'barrier':
          return [[device.placementId, { kind: 'barrier', retraction: device.retraction }]];
        case 'springboard':
          return [[device.placementId, { kind: 'springboard', compression: device.compression }]];
        case 'lever':
        case 'conveyor':
          return [];
      }
    }),
  ),
});

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
  scale: (x, y) => {
    context.scale(x, y);
  },
  drawImage: (source, x, y, width, height) => {
    if (!isImageBitmapSource(source)) {
      throw new Error('Le renderer a reçu une source de sprite non exploitable.');
    }

    context.drawImage(source, x, y, width, height);
  },
  drawImageRegion: (source, sx, sy, sw, sh, x, y, width, height) => {
    if (!isImageBitmapSource(source)) {
      throw new Error('Le renderer a reçu une source de sprite non exploitable.');
    }

    context.drawImage(source, sx, sy, sw, sh, x, y, width, height);
  },
  beginPath: () => {
    context.beginPath();
  },
  moveTo: (x, y) => {
    context.moveTo(x, y);
  },
  lineTo: (x, y) => {
    context.lineTo(x, y);
  },
  arc: (x, y, radius, startAngle, endAngle) => {
    context.arc(x, y, radius, startAngle, endAngle);
  },
  stroke: () => {
    context.stroke();
  },
  fill: () => {
    context.fill();
  },
  fillText: (text, x, y) => {
    context.fillText(text, x, y);
  },
  get globalAlpha() {
    return context.globalAlpha;
  },
  set globalAlpha(value: number) {
    context.globalAlpha = value;
  },
  get strokeStyle() {
    return typeof context.strokeStyle === 'string' ? context.strokeStyle : '';
  },
  set strokeStyle(value: string) {
    context.strokeStyle = value;
  },
  get fillStyle() {
    return typeof context.fillStyle === 'string' ? context.fillStyle : '';
  },
  set fillStyle(value: string) {
    context.fillStyle = value;
  },
  get lineCap() {
    return context.lineCap;
  },
  set lineCap(value: CanvasLineCap) {
    context.lineCap = value;
  },
  get font() {
    return context.font;
  },
  set font(value: string) {
    context.font = value;
  },
  get textAlign() {
    return context.textAlign;
  },
  set textAlign(value: CanvasTextAlign) {
    context.textAlign = value;
  },
  get textBaseline() {
    return context.textBaseline;
  },
  set textBaseline(value: CanvasTextBaseline) {
    context.textBaseline = value;
  },
  strokeRect: (x, y, width, height) => {
    context.strokeRect(x, y, width, height);
  },
  setLineDash: (segments) => {
    context.setLineDash([...segments]);
  },
  fillRect: (x, y, width, height) => {
    context.fillRect(x, y, width, height);
  },
  get lineWidth() {
    return context.lineWidth;
  },
  set lineWidth(value: number) {
    context.lineWidth = value;
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
          const displayedDocument = (simulationAttempt ?? currentEditorAttempt(currentSession))
            .document;
          const projection = projectLevel(
            displayedDocument,
            simulationAttempt !== null && simulation !== null
              ? simulationView(simulation)
              : undefined,
          );
          const selectedPlacementId = currentSession.selectedPlacementId;
          const projectionWithEffectiveCapabilities =
            currentSession.mode === 'creation' && selectedPlacementId !== null
              ? {
                  ...projection,
                  objects: projection.objects.map((object) =>
                    object.id === selectedPlacementId &&
                    (object.family === 'beam' || object.family === 'lever')
                      ? { ...object, rotatable: true }
                      : object,
                  ),
                }
              : projection;
          const { manipulation } = currentSession;
          const constructionView =
            currentSession.phase === 'construction'
              ? {
                  ...(selectedPlacementId !== null && { selectedPlacementId }),
                  ...(currentSession.mode === 'resolution' && {
                    buildZones: displayedDocument.buildZones,
                  }),
                  ...(manipulation !== null &&
                    manipulation.invalidReason !== null && {
                      invalidPlacementId: manipulation.placementId,
                    }),
                }
              : {};
          await renderer.render({ ...projectionWithEffectiveCapabilities, ...constructionView });
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
      {/*
        D4 (plan-remise-en-jeu.md § 6, arbitrated by the product owner): the
        frame fills all the space the surrounding chrome leaves, so no dead
        zone is left around the board; the camera's own `fitCameraToScene`
        "contain" keeps the whole scene visible and centred inside it.
      */}
      <div className="board-scene-row">
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
            data-camera-origin={`${String(camera.origin.x)},${String(camera.origin.y)}`}
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

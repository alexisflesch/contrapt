/**
 * Pure camera math for the board (ADR 0007 § Caméra). No DOM dependency: the
 * caller reads canvas size and pointer geometry, this module only computes
 * `Camera` values from world-unit rectangles and CSS-pixel inputs.
 *
 * `Camera.origin` is the world point at the canvas's top-left corner — the
 * same convention `worldToPixels` in `board-renderer.ts` already assumes.
 * No camera state is persisted: every value here is derived from the scene
 * rectangle and the current canvas size.
 */

/**
 * These three shapes are structural, not part of the exported surface: a
 * caller can pass any `{ x, y }` (e.g. `ScreenPoint` from
 * `src/app/screen-point-to-world.ts`) or `{ width, height }` object.
 * `Camera` and `SceneRect` are the module's real, named contract types.
 */
interface WorldPoint {
  readonly x: number;
  readonly y: number;
}

/** A point or delta expressed in CSS pixels, relative to the canvas's own rect. */
interface CssPoint {
  readonly x: number;
  readonly y: number;
}

interface CanvasSizeInCss {
  readonly width: number;
  readonly height: number;
}

export interface SceneRect {
  readonly min: WorldPoint;
  readonly max: WorldPoint;
}

export interface Camera {
  readonly origin: WorldPoint;
  readonly pixelsPerWorldUnit: number;
}

/** ADR 0007 § Caméra: "Ajuster à la scène" leaves a 4 % margin on every side. */
export const SCENE_FIT_MARGIN_RATIO = 0.04;

/** ADR 0007 § Caméra: zoom bounds are [0.6×, 4×] the "Ajuster à la scène" zoom. */
export const CAMERA_ZOOM_MIN_RATIO = 0.6;
export const CAMERA_ZOOM_MAX_RATIO = 4;

/**
 * ADR 0007 § Caméra: absolute floor, independent of the scene or the fit.
 * This is what makes the sub-pixel-scene failure that motivated this ADR
 * structurally impossible: no computation in this module can ever produce a
 * zoom below this value.
 */
export const CAMERA_MIN_PIXELS_PER_WORLD_UNIT = 24;

const clampNumber = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

const nonNegativeFinite = (value: number): number =>
  Number.isFinite(value) && value > 0 ? value : 0;

const sceneSize = (scene: SceneRect): { readonly width: number; readonly height: number } => ({
  width: scene.max.x - scene.min.x,
  height: scene.max.y - scene.min.y,
});

const sceneCenter = (scene: SceneRect): WorldPoint => ({
  x: (scene.min.x + scene.max.x) / 2,
  y: (scene.min.y + scene.max.y) / 2,
});

/**
 * Computes a `contain` fit of `scene` inside `canvasSize`, applying
 * `marginRatio` on every side and centering the scene. Total and safe for a
 * zero or near-zero canvas: the absolute floor below always applies, so the
 * result is always a usable camera, never a division that collapses the
 * scene under a pixel (the failure ADR 0007 documents).
 */
export const fitCameraToScene = (
  scene: SceneRect,
  canvasSizeInCss: CanvasSizeInCss,
  marginRatio: number = SCENE_FIT_MARGIN_RATIO,
): Camera => {
  const { width: sceneWidth, height: sceneHeight } = sceneSize(scene);
  const safeWidth = nonNegativeFinite(canvasSizeInCss.width);
  const safeHeight = nonNegativeFinite(canvasSizeInCss.height);
  const safeMargin = Number.isFinite(marginRatio) ? clampNumber(marginRatio, 0, 0.9) : 0;
  const fitFactor = 1 - safeMargin;

  const rawZoom =
    sceneWidth > 0 && sceneHeight > 0
      ? Math.min(safeWidth / sceneWidth, safeHeight / sceneHeight) * fitFactor
      : 0;
  const pixelsPerWorldUnit = Math.max(rawZoom, CAMERA_MIN_PIXELS_PER_WORLD_UNIT);

  const center = sceneCenter(scene);
  return {
    pixelsPerWorldUnit,
    origin: {
      x: center.x - safeWidth / 2 / pixelsPerWorldUnit,
      y: center.y - safeHeight / 2 / pixelsPerWorldUnit,
    },
  };
};

/**
 * ADR 0007 § Caméra: the zoom bounds relative to the current scene/canvas
 * pair, with the absolute floor folded in so callers never have to apply it
 * separately.
 */
export const computeCameraZoomBounds = (
  scene: SceneRect,
  canvasSizeInCss: CanvasSizeInCss,
): { readonly min: number; readonly max: number } => {
  const fitted = fitCameraToScene(scene, canvasSizeInCss).pixelsPerWorldUnit;
  const min = Math.max(fitted * CAMERA_ZOOM_MIN_RATIO, CAMERA_MIN_PIXELS_PER_WORLD_UNIT);
  const max = Math.max(fitted * CAMERA_ZOOM_MAX_RATIO, min);
  return { min, max };
};

/**
 * ADR 0007 § Caméra: bounds `camera`'s origin so the scene rectangle can
 * never leave the canvas entirely — at least one edge always overlaps.
 * Leaves `pixelsPerWorldUnit` untouched; zoom bounds are a separate concern
 * (`computeCameraZoomBounds`, applied by `zoomCameraAt`).
 */
export const clampCamera = (
  camera: Camera,
  scene: SceneRect,
  canvasSizeInCss: CanvasSizeInCss,
): Camera => {
  const zoom =
    Number.isFinite(camera.pixelsPerWorldUnit) && camera.pixelsPerWorldUnit > 0
      ? camera.pixelsPerWorldUnit
      : CAMERA_MIN_PIXELS_PER_WORLD_UNIT;
  const safeWidth = nonNegativeFinite(canvasSizeInCss.width);
  const safeHeight = nonNegativeFinite(canvasSizeInCss.height);
  const canvasWidthInWorld = safeWidth / zoom;
  const canvasHeightInWorld = safeHeight / zoom;

  return {
    pixelsPerWorldUnit: zoom,
    origin: {
      x: clampNumber(camera.origin.x, scene.min.x - canvasWidthInWorld, scene.max.x),
      y: clampNumber(camera.origin.y, scene.min.y - canvasHeightInWorld, scene.max.y),
    },
  };
};

/**
 * Zooms by `factor`, bounded per ADR 0007, keeping the world point under
 * `anchorInCss` fixed on screen. `anchorInCss` is relative to the canvas's
 * own rect (its top-left corner), matching `Camera.origin`'s convention.
 */
export const zoomCameraAt = (
  camera: Camera,
  factor: number,
  anchorInCss: CssPoint,
  scene: SceneRect,
  canvasSizeInCss: CanvasSizeInCss,
): Camera => {
  const safeFactor = Number.isFinite(factor) && factor > 0 ? factor : 1;
  const bounds = computeCameraZoomBounds(scene, canvasSizeInCss);
  const nextZoom = clampNumber(camera.pixelsPerWorldUnit * safeFactor, bounds.min, bounds.max);

  const anchorWorld: WorldPoint = {
    x: camera.origin.x + anchorInCss.x / camera.pixelsPerWorldUnit,
    y: camera.origin.y + anchorInCss.y / camera.pixelsPerWorldUnit,
  };

  const nextOrigin: WorldPoint = {
    x: anchorWorld.x - anchorInCss.x / nextZoom,
    y: anchorWorld.y - anchorInCss.y / nextZoom,
  };

  return clampCamera({ origin: nextOrigin, pixelsPerWorldUnit: nextZoom }, scene, canvasSizeInCss);
};

/**
 * Translates the camera by `deltaInCss` (a CSS-pixel screen delta, e.g. a
 * finger's movement since the last frame): the world point that was under
 * the pointer stays under the pointer. Bounded so the scene can never leave
 * the canvas entirely.
 */
export const panCamera = (
  camera: Camera,
  deltaInCss: CssPoint,
  scene: SceneRect,
  canvasSizeInCss: CanvasSizeInCss,
): Camera => {
  const dx = Number.isFinite(deltaInCss.x) ? deltaInCss.x : 0;
  const dy = Number.isFinite(deltaInCss.y) ? deltaInCss.y : 0;

  const nextOrigin: WorldPoint = {
    x: camera.origin.x - dx / camera.pixelsPerWorldUnit,
    y: camera.origin.y - dy / camera.pixelsPerWorldUnit,
  };

  return clampCamera(
    { origin: nextOrigin, pixelsPerWorldUnit: camera.pixelsPerWorldUnit },
    scene,
    canvasSizeInCss,
  );
};

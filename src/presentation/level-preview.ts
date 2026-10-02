import type { LevelDocument } from '../domain/level-document';
import {
  createBoardRenderer,
  projectLevel,
  type BoardCanvasContext,
  type BoardViewport,
} from './board-renderer';
import type { SpriteLoader } from './sprite-loader';

/**
 * Width, in the renderer's CSS pixels, of the drawing area every preview is laid
 * out in (V5). The board draws a one-pixel grid and a 24-pixel zoom floor in CSS
 * pixels; laying a thumbnail out in its own few hundred pixels would thin the
 * grid out and lose the look of the board. The preview is drawn at this fixed
 * logical size and the device-pixel ratio absorbs the difference, so a card of
 * any size shows the same drawing, scaled.
 */
export const LEVEL_PREVIEW_REFERENCE_WIDTH = 640;

type PreviewScene = LevelDocument['scene'];

type PreviewSize = Readonly<{
  readonly width: number;
  readonly height: number;
}>;

/**
 * The camera of a preview (V5): the whole scene, centred, with no margin. The
 * paper and the grid carry on around it when the preview's ratio is not the
 * scene's. Unlike the board's "Ajuster à la scène", there is no zoom floor, so
 * the scene always fits however small the thumbnail.
 */
export const previewViewport = (
  scene: PreviewScene,
  size: PreviewSize,
  devicePixelRatio: number,
): BoardViewport => {
  const cssWidth = LEVEL_PREVIEW_REFERENCE_WIDTH;
  const cssHeight = (cssWidth * size.height) / size.width;
  const sceneWidth = scene.max.x - scene.min.x;
  const sceneHeight = scene.max.y - scene.min.y;
  const pixelsPerWorldUnit = Math.min(cssWidth / sceneWidth, cssHeight / sceneHeight);

  return {
    cssWidth,
    cssHeight,
    pixelsPerWorldUnit,
    origin: {
      x: (scene.min.x + scene.max.x) / 2 - cssWidth / 2 / pixelsPerWorldUnit,
      y: (scene.min.y + scene.max.y) / 2 - cssHeight / 2 / pixelsPerWorldUnit,
    },
    devicePixelRatio: (size.width * devicePixelRatio) / cssWidth,
  };
};

type LevelPreviewOptions = Readonly<{
  readonly document: LevelDocument;
  /** Size of the image once displayed, in CSS pixels. */
  readonly cssWidth: number;
  readonly cssHeight: number;
  /** The canvas ends up `cssWidth × devicePixelRatio` device pixels wide. */
  readonly devicePixelRatio: number;
  readonly canvas: { width: number; height: number };
  readonly context: BoardCanvasContext;
  readonly spriteLoader: SpriteLoader;
}>;

/**
 * Draws a level as it is at the start (V5): the board's own renderer and
 * projection, with no simulation, selection, handle, zone or outline. It reads
 * neither the clock nor a random source, so equal documents give equal images.
 */
export const renderLevelPreview = async ({
  document,
  cssWidth,
  cssHeight,
  devicePixelRatio,
  canvas,
  context,
  spriteLoader,
}: LevelPreviewOptions): Promise<void> => {
  const viewport = previewViewport(
    document.scene,
    { width: cssWidth, height: cssHeight },
    devicePixelRatio,
  );
  const projection = projectLevel(document);

  await createBoardRenderer({ canvas, context, viewport, spriteLoader }).render({
    ...projection,
    // The dashed « à placer » outline is a workshop aid, not part of the picture.
    toPlaceIds: [],
  });
};

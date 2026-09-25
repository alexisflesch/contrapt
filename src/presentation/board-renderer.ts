import type { LevelDocument } from '../domain/level-document';
import {
  spriteAssetPath,
  spriteAssetsForFamily,
  type SpriteAsset,
  type SpriteFamily,
  type SpriteLoader,
} from './sprite-loader';

type BoardPoint = Readonly<{
  readonly x: number;
  readonly y: number;
}>;

export type BoardViewport = Readonly<{
  readonly cssWidth: number;
  readonly cssHeight: number;
  readonly origin: BoardPoint;
  readonly pixelsPerWorldUnit: number;
  readonly devicePixelRatio: number;
}>;

type BoardCanvas = {
  width: number;
  height: number;
};

/** The renderer only depends on the Canvas 2D operations it actually uses. */
export type BoardCanvasContext = {
  /** Allows richer Canvas test doubles without widening the renderer's API. */
  readonly [additionalCanvasOperation: string]: unknown;
  readonly save: () => void;
  readonly restore: () => void;
  readonly setTransform: (
    horizontalScale: number,
    verticalSkew: number,
    horizontalSkew: number,
    verticalScale: number,
    horizontalTranslation: number,
    verticalTranslation: number,
  ) => void;
  readonly translate: (x: number, y: number) => void;
  readonly rotate: (radians: number) => void;
  lineWidth?: number;
  readonly strokeRect?: (
    destinationX: number,
    destinationY: number,
    destinationWidth: number,
    destinationHeight: number,
  ) => void;
  readonly drawImage: (
    source: unknown,
    destinationX: number,
    destinationY: number,
    destinationWidth: number,
    destinationHeight: number,
  ) => void;
};

export type BoardDestination = Readonly<{
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}>;

export type ProjectedBoardObject = Readonly<{
  readonly id: string;
  readonly family: SpriteFamily;
  readonly assetKey: SpriteAsset;
  readonly assetPath: string;
  readonly position: BoardPoint;
  readonly rotation: number;
  /** Document order, retained for deterministic presentation interactions. */
  readonly placementOrder: number;
  /** Permission projected for presentation-only affordances. */
  readonly rotatable: boolean;
  /** Bounds in world units, centered on `position`, for rendering and editor framing. */
  readonly destination: BoardDestination;
}>;

export type BoardProjection = Readonly<{
  readonly objects: readonly ProjectedBoardObject[];
  /** Ephemeral selection state; it is never part of `LevelDocument`. */
  readonly selectedPlacementId?: string;
}>;

type FamilyVisual = Readonly<{
  readonly width: number;
  readonly height: number;
}>;

const familyVisuals = {
  ball: {
    width: 0.6,
    height: 0.6,
  },
  basket: {
    width: 1.5,
    height: 1.1,
  },
} satisfies Record<Exclude<SpriteFamily, 'beam' | 'seesaw'>, FamilyVisual>;

/**
 * A4 (ADR 0007) poses the seesaw's base under the pivot rather than centered
 * on it, so its collider footprint is not centered on the placement's origin
 * the way the other three families are: base at y ∈ [0, +0.70], board at
 * y ∈ [-0.12, +0.12], union 3 × 0.82 with its top edge at y = -0.12 relative
 * to the pivot. `centeredDestination` cannot express that asymmetry.
 */
const seesawDestination: BoardDestination = { x: -1.5, y: -0.12, width: 3, height: 0.82 };

/* These dimensions mirror the colliders in simulation-session without importing
 * the physics adapter into presentation. */
const beamVisuals = {
  short: { width: 2, height: 0.25 },
  medium: { width: 4, height: 0.25 },
  long: { width: 6, height: 0.25 },
} satisfies Record<'short' | 'medium' | 'long', FamilyVisual>;

const centeredDestination = ({ width, height }: FamilyVisual): BoardDestination => ({
  x: -width / 2,
  y: -height / 2,
  width,
  height,
});

const destinationForObject = (object: LevelDocument['objects'][number]): BoardDestination => {
  if (object.type === 'beam') return centeredDestination(beamVisuals[object.props.size]);
  if (object.type === 'seesaw') return seesawDestination;

  return centeredDestination(familyVisuals[object.type]);
};

/**
 * Presentation-only draw order (B4/ADR 0007): higher draws later, i.e. on
 * top. The basket is split into a rear layer and a front lip so a ball can be
 * visibly nested inside it. Ranking visual assets explicitly keeps the rule
 * exhaustive: adding a fifth family or layer forces a decision here instead
 * of silently inheriting document order. This never touches `document.objects`
 * or `LevelDocument`; the domain stays unaware that a draw order exists.
 */
const drawOrderByAsset: Record<SpriteAsset, number> = {
  'basket-back': 0,
  beam: 0,
  seesaw: 0,
  ball: 1,
  'basket-front': 2,
};

const byDrawOrderThenDocumentOrder = (
  a: {
    readonly assetKey: SpriteAsset;
    readonly documentIndex: number;
    readonly layerIndex: number;
  },
  b: {
    readonly assetKey: SpriteAsset;
    readonly documentIndex: number;
    readonly layerIndex: number;
  },
): number => {
  const orderDelta = drawOrderByAsset[a.assetKey] - drawOrderByAsset[b.assetKey];
  if (orderDelta !== 0) return orderDelta;

  const documentDelta = a.documentIndex - b.documentIndex;
  return documentDelta !== 0 ? documentDelta : a.layerIndex - b.layerIndex;
};

export const projectLevel = (document: LevelDocument): BoardProjection => {
  const objects = document.objects
    .flatMap((object, documentIndex) =>
      spriteAssetsForFamily(object.type).map((assetKey, layerIndex) => ({
        documentIndex,
        layerIndex,
        projected: {
          id: object.id,
          family: object.type,
          assetKey,
          assetPath: spriteAssetPath(assetKey, 2),
          position: {
            x: object.transform.position.x,
            y: object.transform.position.y,
          },
          rotation: object.transform.rotation,
          placementOrder: documentIndex,
          rotatable: object.permissions.rotate,
          destination: destinationForObject(object),
        },
      })),
    )
    .sort((a, b) =>
      byDrawOrderThenDocumentOrder(
        {
          assetKey: a.projected.assetKey,
          documentIndex: a.documentIndex,
          layerIndex: a.layerIndex,
        },
        {
          assetKey: b.projected.assetKey,
          documentIndex: b.documentIndex,
          layerIndex: b.layerIndex,
        },
      ),
    )
    .map(({ projected }) => projected);

  return { objects };
};

export const worldToPixels = (position: BoardPoint, viewport: BoardViewport): BoardPoint => ({
  x: (position.x - viewport.origin.x) * viewport.pixelsPerWorldUnit,
  y: (position.y - viewport.origin.y) * viewport.pixelsPerWorldUnit,
});

export const worldLengthToPixels = (length: number, viewport: BoardViewport): number =>
  length * viewport.pixelsPerWorldUnit;

const destinationToPixels = (
  destination: BoardDestination,
  viewport: BoardViewport,
): BoardDestination => ({
  x: worldLengthToPixels(destination.x, viewport),
  y: worldLengthToPixels(destination.y, viewport),
  width: worldLengthToPixels(destination.width, viewport),
  height: worldLengthToPixels(destination.height, viewport),
});

type BoardRenderer = Readonly<{
  readonly render: (projection: BoardProjection) => Promise<void>;
}>;

type BoardRendererOptions = Readonly<{
  readonly canvas: BoardCanvas;
  readonly context: BoardCanvasContext;
  readonly viewport: BoardViewport;
  readonly spriteLoader: SpriteLoader;
}>;

const requiredFamilies = (projection: BoardProjection): readonly SpriteFamily[] => [
  ...new Set(projection.objects.map((object) => object.family)),
];

export const ROTATION_HANDLE_SIZE_CSS_PIXELS = 44;
const SELECTION_LINE_WIDTH_CSS_PIXELS = 2;
export const ROTATION_HANDLE_DISTANCE_CSS_PIXELS = 32;

export const rotationHandleBounds = (
  object: ProjectedBoardObject,
  viewport: BoardViewport,
): BoardDestination => {
  const center = worldToPixels(object.position, viewport);

  return {
    x: center.x - ROTATION_HANDLE_SIZE_CSS_PIXELS / 2,
    y: center.y - ROTATION_HANDLE_DISTANCE_CSS_PIXELS - ROTATION_HANDLE_SIZE_CSS_PIXELS / 2,
    width: ROTATION_HANDLE_SIZE_CSS_PIXELS,
    height: ROTATION_HANDLE_SIZE_CSS_PIXELS,
  };
};

const selectedObject = (projection: BoardProjection): ProjectedBoardObject | undefined => {
  if (projection.selectedPlacementId === undefined) return undefined;

  return projection.objects.find((object) => object.id === projection.selectedPlacementId);
};

const drawSelection = (
  context: BoardCanvasContext,
  object: ProjectedBoardObject,
  viewport: BoardViewport,
): void => {
  if (context.strokeRect === undefined) return;

  const position = worldToPixels(object.position, viewport);
  const destination = destinationToPixels(object.destination, viewport);

  context.save();
  context.translate(position.x, position.y);
  context.rotate(object.rotation);
  if (context.lineWidth !== undefined) {
    context.lineWidth = SELECTION_LINE_WIDTH_CSS_PIXELS;
  }
  context.strokeRect(destination.x, destination.y, destination.width, destination.height);
  context.restore();

  if (!object.rotatable) return;

  const handle = rotationHandleBounds(object, viewport);
  context.save();
  context.strokeRect(handle.x, handle.y, handle.width, handle.height);
  context.restore();
};

export const createBoardRenderer = ({
  canvas,
  context,
  viewport,
  spriteLoader,
}: BoardRendererOptions): BoardRenderer => ({
  render: async (projection): Promise<void> => {
    await spriteLoader.loadForFamilies(requiredFamilies(projection));

    canvas.width = Math.round(viewport.cssWidth * viewport.devicePixelRatio);
    canvas.height = Math.round(viewport.cssHeight * viewport.devicePixelRatio);
    context.setTransform(viewport.devicePixelRatio, 0, 0, viewport.devicePixelRatio, 0, 0);

    for (const object of projection.objects) {
      const sprite = spriteLoader.getSprite(object.assetKey);
      if (sprite === undefined) {
        throw new Error(`Le sprite « ${object.assetKey} » n’est pas disponible après chargement.`);
      }

      const position = worldToPixels(object.position, viewport);
      const { x, y, width, height } = destinationToPixels(object.destination, viewport);

      context.save();
      context.translate(position.x, position.y);
      context.rotate(object.rotation);
      context.drawImage(sprite.source !== undefined ? sprite.source : sprite, x, y, width, height);
      context.restore();
    }

    const selection = selectedObject(projection);
    if (selection !== undefined) {
      drawSelection(context, selection, viewport);
    }
  },
});

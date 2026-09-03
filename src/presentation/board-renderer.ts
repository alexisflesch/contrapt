import type { LevelDocument } from '../domain/level-document';
import { spriteAssetPath, type SpriteFamily, type SpriteLoader } from './sprite-loader';

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
export type BoardCanvasContext = Readonly<{
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
  readonly drawImage: (
    source: unknown,
    destinationX: number,
    destinationY: number,
    destinationWidth: number,
    destinationHeight: number,
  ) => void;
}>;

export type BoardDestination = Readonly<{
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}>;

export type ProjectedBoardObject = Readonly<{
  readonly id: string;
  readonly family: SpriteFamily;
  readonly assetPath: string;
  readonly position: BoardPoint;
  readonly rotation: number;
  /** Bounds in world units, centered on `position`, for rendering and editor framing. */
  readonly destination: BoardDestination;
}>;

export type BoardProjection = Readonly<{
  readonly objects: readonly ProjectedBoardObject[];
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

export const projectLevel = (document: LevelDocument): BoardProjection => ({
  objects: document.objects.map((object) => ({
    id: object.id,
    family: object.type,
    assetPath: spriteAssetPath(object.type, 2),
    position: {
      x: object.transform.position.x,
      y: object.transform.position.y,
    },
    rotation: object.transform.rotation,
    destination: destinationForObject(object),
  })),
});

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
      const sprite = spriteLoader.getSprite(object.family);
      if (sprite === undefined) {
        throw new Error(`Le sprite « ${object.family} » n’est pas disponible après chargement.`);
      }

      const position = worldToPixels(object.position, viewport);
      const { x, y, width, height } = destinationToPixels(object.destination, viewport);

      context.save();
      context.translate(position.x, position.y);
      context.rotate(object.rotation);
      context.drawImage(sprite.source !== undefined ? sprite.source : sprite, x, y, width, height);
      context.restore();
    }
  },
});

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

type BoardDestination = Readonly<{
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}>;

type ProjectedBoardObject = Readonly<{
  readonly id: string;
  readonly family: SpriteFamily;
  readonly assetPath: string;
  readonly position: BoardPoint;
  readonly rotation: number;
  readonly destination: BoardDestination;
}>;

type BoardProjection = Readonly<{
  readonly objects: readonly ProjectedBoardObject[];
}>;

type FamilyVisual = Readonly<{
  readonly width: number;
  readonly height: number;
}>;

const familyVisuals = {
  ball: {
    width: 32,
    height: 32,
  },
  basket: {
    width: 64,
    height: 48,
  },
  beam: {
    width: 96,
    height: 24,
  },
  seesaw: {
    width: 96,
    height: 48,
  },
} satisfies Record<SpriteFamily, FamilyVisual>;

const centeredDestination = ({ width, height }: FamilyVisual): BoardDestination => ({
  x: -width / 2,
  y: -height / 2,
  width,
  height,
});

export const projectLevel = (document: LevelDocument): BoardProjection => ({
  objects: document.objects.map((object) => {
    const visual = familyVisuals[object.type];

    return {
      id: object.id,
      family: object.type,
      assetPath: spriteAssetPath(object.type, 2),
      position: {
        x: object.transform.position.x,
        y: object.transform.position.y,
      },
      rotation: object.transform.rotation,
      destination: centeredDestination(visual),
    };
  }),
});

export const worldToPixels = (position: BoardPoint, viewport: BoardViewport): BoardPoint => ({
  x: (position.x - viewport.origin.x) * viewport.pixelsPerWorldUnit,
  y: (position.y - viewport.origin.y) * viewport.pixelsPerWorldUnit,
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
      const { x, y, width, height } = object.destination;

      context.save();
      context.translate(position.x, position.y);
      context.rotate(object.rotation);
      context.drawImage(sprite.source !== undefined ? sprite.source : sprite, x, y, width, height);
      context.restore();
    }
  },
});

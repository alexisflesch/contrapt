import {
  rotationHandleBounds,
  worldToPixels,
  type BoardViewport,
  type ProjectedBoardObject,
} from './board-renderer';

type BoardScreenPoint = Readonly<{
  readonly x: number;
  readonly y: number;
}>;

const MINIMUM_TOUCH_TARGET_CSS_PIXELS = 44;

const uniqueObjectsByLatestPlacement = (
  objects: readonly ProjectedBoardObject[],
): readonly ProjectedBoardObject[] => {
  const latestById = new Map<string, ProjectedBoardObject>();

  for (const object of objects) {
    const current = latestById.get(object.id);
    if (current === undefined || object.placementOrder > current.placementOrder) {
      latestById.set(object.id, object);
    }
  }

  return [...latestById.values()].sort((a, b) => b.placementOrder - a.placementOrder);
};

const isInsideExpandedFootprint = (
  point: BoardScreenPoint,
  object: ProjectedBoardObject,
  viewport: BoardViewport,
): boolean => {
  const center = worldToPixels(object.position, viewport);
  const horizontalOffset = point.x - center.x;
  const verticalOffset = point.y - center.y;
  const cosine = Math.cos(object.rotation);
  const sine = Math.sin(object.rotation);
  const localX = horizontalOffset * cosine + verticalOffset * sine;
  const localY = -horizontalOffset * sine + verticalOffset * cosine;
  const scale = viewport.pixelsPerWorldUnit;
  const width = Math.max(object.destination.width * scale, MINIMUM_TOUCH_TARGET_CSS_PIXELS);
  const height = Math.max(object.destination.height * scale, MINIMUM_TOUCH_TARGET_CSS_PIXELS);
  const footprintCenterX = (object.destination.x + object.destination.width / 2) * scale;
  const footprintCenterY = (object.destination.y + object.destination.height / 2) * scale;

  return (
    Math.abs(localX - footprintCenterX) <= width / 2 &&
    Math.abs(localY - footprintCenterY) <= height / 2
  );
};

/**
 * Returns the latest placed object under a CSS-pixel point. Visual layering is
 * deliberately ignored: interaction priority follows placement order instead.
 */
export const hitTestBoard = (
  point: BoardScreenPoint,
  objects: readonly ProjectedBoardObject[],
  viewport: BoardViewport,
): string | null => {
  for (const object of uniqueObjectsByLatestPlacement(objects)) {
    if (isInsideExpandedFootprint(point, object, viewport)) return object.id;
  }

  return null;
};

/** Tests only the explicit rotation affordance, never the object's footprint. */
export const hitTestRotationHandle = (
  point: BoardScreenPoint,
  object: ProjectedBoardObject,
  viewport: BoardViewport,
): boolean => {
  if (!object.rotatable) return false;

  const handle = rotationHandleBounds(object, viewport);
  return (
    point.x >= handle.x &&
    point.x <= handle.x + handle.width &&
    point.y >= handle.y &&
    point.y <= handle.y + handle.height
  );
};

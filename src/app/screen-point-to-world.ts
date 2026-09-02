export interface ScreenPoint {
  readonly x: number;
  readonly y: number;
}

export interface BoardOffset {
  readonly left: number;
  readonly top: number;
}

/** Converts a viewport point to world units relative to the board origin. */
export const screenPointToWorld = (
  point: ScreenPoint,
  boardRect: BoardOffset,
  zoom: number,
  origin: ScreenPoint = { x: 0, y: 0 },
): ScreenPoint => ({
  x: origin.x + (point.x - boardRect.left) / zoom,
  y: origin.y + (point.y - boardRect.top) / zoom,
});

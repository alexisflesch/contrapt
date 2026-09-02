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
): ScreenPoint => ({
  x: (point.x - boardRect.left) / zoom,
  y: (point.y - boardRect.top) / zoom,
});

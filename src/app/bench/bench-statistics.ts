/** Thresholds of the phone gate (ADR 0002): a steady 60 Hz display, with physics well inside a frame. */
const MIN_FRAMES_PER_SECOND = 55;
const MAX_PHYSICS_P95_MILLISECONDS = 8;

export interface DurationSummary {
  readonly count: number;
  readonly median: number;
  readonly p95: number;
  readonly max: number;
}

/** Nearest-rank percentile on an ascending series. */
const percentile = (sorted: readonly number[], ratio: number): number =>
  sorted[Math.max(0, Math.ceil(ratio * sorted.length) - 1)] ?? Number.NaN;

export const summarizeDurations = (durations: readonly number[]): DurationSummary => {
  if (durations.length === 0) throw new RangeError('Aucune durée à résumer.');
  const sorted = [...durations].sort((a, b) => a - b);
  const middle = sorted.length / 2;
  const median = Number.isInteger(middle)
    ? ((sorted[middle - 1] ?? Number.NaN) + (sorted[middle] ?? Number.NaN)) / 2
    : (sorted[Math.floor(middle)] ?? Number.NaN);

  return {
    count: sorted.length,
    median,
    p95: percentile(sorted, 0.95),
    max: sorted[sorted.length - 1] ?? Number.NaN,
  };
};

/**
 * Frames shown during the last `windowMilliseconds` of `timestamps` (ascending
 * `requestAnimationFrame` times), scaled to one second. Zero until the series
 * covers a full window, so a half-started measure never reads as a verdict.
 */
export const framesPerSecondOverWindow = (
  timestamps: readonly number[],
  windowMilliseconds: number,
): number => {
  const last = timestamps[timestamps.length - 1];
  const first = timestamps[0];
  if (last === undefined || first === undefined || last - first < windowMilliseconds) return 0;
  const framesInWindow = timestamps.filter((time) => time > last - windowMilliseconds).length;
  return Math.round((framesInWindow * 1000) / windowMilliseconds);
};

type BenchVerdict = 'ok' | 'to-review';

/** `framesPerSecond` is null until the scene has been played on the board. */
export const benchVerdict = ({
  framesPerSecond,
  physicsP95Milliseconds,
}: {
  readonly framesPerSecond: number | null;
  readonly physicsP95Milliseconds: number;
}): BenchVerdict =>
  physicsP95Milliseconds < MAX_PHYSICS_P95_MILLISECONDS &&
  (framesPerSecond === null || framesPerSecond >= MIN_FRAMES_PER_SECOND)
    ? 'ok'
    : 'to-review';

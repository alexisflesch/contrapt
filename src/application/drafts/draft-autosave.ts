type DraftAutosaveTrigger = 'edit' | 'test-launch';

export interface DraftAutosaveState {
  /** Time of the most recent save attempt, from an injected monotonic clock. */
  readonly lastAttemptAt: number | null;
}

interface DraftAutosaveDecision {
  readonly shouldSave: boolean;
  readonly state: DraftAutosaveState;
}

const AUTOSAVE_INTERVAL_MILLISECONDS = 1_000;

/** Decide whether to save without reading a global clock or causing side effects. */
export const decideDraftAutosave = (
  state: DraftAutosaveState,
  trigger: DraftAutosaveTrigger,
  nowMilliseconds: number,
): DraftAutosaveDecision => {
  if (!Number.isFinite(nowMilliseconds)) return { shouldSave: false, state };

  const lastAttemptAt = state.lastAttemptAt;
  const shouldSave =
    trigger === 'test-launch' ||
    lastAttemptAt === null ||
    !Number.isFinite(lastAttemptAt) ||
    nowMilliseconds - lastAttemptAt >= AUTOSAVE_INTERVAL_MILLISECONDS;

  return {
    shouldSave,
    state: shouldSave ? { lastAttemptAt: nowMilliseconds } : state,
  };
};

import type { EditorSession } from '../application/editor-session/editor-session';

/**
 * U8: the brief hint of the campaign's first level points first to « Lancer »
 * (see the machine run), then, back in construction, to the object drawer.
 */
export type FirstLevelHintStep = 'launch' | 'drawer';

interface FirstLevelHintOffer {
  /** Position of the level in the embedded campaign (0 for level 1). */
  readonly levelIndex: number;
  readonly isLevelSolved: boolean;
  /** Persisted once the hint was closed or followed (`Preferences.firstLevelHintDone`). */
  readonly isHintDone: boolean;
}

/** Only level 1 of the campaign, never solved, whose hint was neither closed nor followed. */
export const offersFirstLevelHint = ({
  levelIndex,
  isLevelSolved,
  isHintDone,
}: FirstLevelHintOffer): boolean => levelIndex === 0 && !isLevelSolved && !isHintDone;

interface FirstLevelHintState {
  readonly phase: EditorSession['phase'];
  /** Whether the machine was launched at least once during this visit. */
  readonly hasLaunched: boolean;
  /** Whether a command was committed on the board (the first placement, typically). */
  readonly hasActed: boolean;
}

/** The step to show, or `null`: silent while simulating and once the player has acted. */
export const firstLevelHintStep = ({
  phase,
  hasLaunched,
  hasActed,
}: FirstLevelHintState): FirstLevelHintStep | null => {
  if (phase !== 'construction' || hasActed) return null;
  return hasLaunched ? 'drawer' : 'launch';
};

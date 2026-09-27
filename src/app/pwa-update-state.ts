import type { EditorSession } from '../application/editor-session/editor-session';

type UpdatePromptPhase = Pick<EditorSession, 'phase' | 'manipulation'>;

/** A waiting service worker may be offered only outside simulation and gestures. */
export const canPromptUpdate = (phase: UpdatePromptPhase): boolean =>
  phase.phase !== 'running' && phase.phase !== 'paused' && phase.manipulation === null;

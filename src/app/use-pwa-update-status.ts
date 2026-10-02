import type { EditorSession } from '../application/editor-session/editor-session';
import { canPromptUpdate } from './pwa-update-state';
import { usePwa } from './use-pwa';

/** Reports whether a waiting update can be offered in the current editor phase. */
export function usePwaUpdateStatus(phase: Pick<EditorSession, 'phase' | 'manipulation'>): boolean {
  return usePwa().isUpdateWaiting && canPromptUpdate(phase);
}

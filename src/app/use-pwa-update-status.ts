import { useContext } from 'react';

import type { EditorSession } from '../application/editor-session/editor-session';
import { pwaUpdateAvailableContext } from './pwa-update-context';
import { canPromptUpdate } from './pwa-update-state';

/** Reports whether a waiting update can be offered in the current editor phase. */
export function usePwaUpdateStatus(phase: Pick<EditorSession, 'phase' | 'manipulation'>): boolean {
  const updateAvailable = useContext(pwaUpdateAvailableContext);
  if (updateAvailable === null) {
    throw new Error('usePwaUpdateStatus doit être utilisé dans PwaUpdateProvider.');
  }
  return updateAvailable && canPromptUpdate(phase);
}

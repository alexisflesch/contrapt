import { useContext } from 'react';

import { pwaContext, type PwaState } from './pwa-update-context';

/** The PWA state and actions (U10); the update's phase gate is `usePwaUpdateStatus`. */
export function usePwa(): PwaState {
  const state = useContext(pwaContext);
  if (state === null) {
    throw new Error('usePwa doit être utilisé dans PwaUpdateProvider.');
  }
  return state;
}

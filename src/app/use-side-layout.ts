import { useSyncExternalStore } from 'react';

function subscribeToSideLayout(onChange: () => void) {
  if (typeof window === 'undefined') return () => undefined;

  window.addEventListener('resize', onChange);
  window.addEventListener('orientationchange', onChange);
  return () => {
    window.removeEventListener('resize', onChange);
    window.removeEventListener('orientationchange', onChange);
  };
}

function getSideLayoutSnapshot() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;

  // Kept in sync with the wide-layout media query. Three permanent rails are
  // only useful with enough width *and* height; all other formats use
  // viewport overlays.
  return window.innerWidth >= 1000 && window.innerHeight >= 700;
}

/**
 * True when the viewport supports the permanent three-rail composition.
 */
export function useIsSideLayout(): boolean {
  return useSyncExternalStore(subscribeToSideLayout, getSideLayoutSnapshot, () => false);
}

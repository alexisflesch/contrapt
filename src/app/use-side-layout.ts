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

  return (
    window.innerWidth >= 680 || (window.innerWidth >= 560 && window.innerWidth > window.innerHeight)
  );
}

/**
 * True once the viewport is wide enough (mobile-editor-interactions.md) that
 * the object drawer renders as an open side panel instead of a collapsible
 * bottom sheet.
 */
export function useIsSideLayout(): boolean {
  return useSyncExternalStore(subscribeToSideLayout, getSideLayoutSnapshot, () => false);
}

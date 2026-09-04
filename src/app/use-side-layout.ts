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

  // Kept in sync with styles.css's `(orientation: landscape) and
  // (min-width: 680px) and (min-height: 480px)` breakpoint (D4,
  // plan-remise-en-jeu.md § 6): a plain width threshold sent a portrait
  // tablet onto the side-panel layout, and a plain landscape+width
  // threshold admitted a landscape phone too short to fit three columns.
  return (
    window.innerWidth >= 680 &&
    window.innerHeight >= 480 &&
    window.innerWidth > window.innerHeight
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

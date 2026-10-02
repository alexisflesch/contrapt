import { createContext } from 'react';

/** What the app can do with an install prompt the browser handed over (U10). */
export type PwaInstallOutcome = 'accepted' | 'dismissed' | 'unavailable';

/** The PWA state shared by `PwaUpdateProvider` (ADR 0012, L28, U10). */
export interface PwaState {
  /** A new service worker is installed and waiting. */
  readonly isUpdateWaiting: boolean;
  /** « Plus tard » was touched during this visit; nothing is persisted. */
  readonly isUpdateDismissed: boolean;
  /** Activates the waiting service worker, which reloads the page; only on the player's demand. */
  readonly applyUpdate: () => void;
  readonly dismissUpdate: () => void;
  /** The browser fired a usable `beforeinstallprompt` that has not been used yet. */
  readonly isInstallAvailable: boolean;
  /** Opens the browser's own install prompt; an event serves only once. */
  readonly install: () => Promise<PwaInstallOutcome>;
}

export const pwaContext = createContext<PwaState | null>(null);

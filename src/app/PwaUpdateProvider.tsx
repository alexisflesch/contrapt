import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { pwaContext, type PwaInstallOutcome, type PwaState } from './pwa-update-context';

/** Activates the waiting service worker (`registerSW`'s `updateSW`), which reloads the page. */
type ApplyUpdate = () => Promise<void>;

/**
 * Registers the service worker and calls `onNeedRefresh` once a new version
 * waits; resolves to the function that applies it, or `null` without one.
 * Injected by tests (U10); production uses `vite-plugin-pwa`'s `registerSW`.
 */
export type RegisterServiceWorker = (onNeedRefresh: () => void) => Promise<ApplyUpdate | null>;

const registerProductionServiceWorker: RegisterServiceWorker = async (onNeedRefresh) => {
  if (
    !import.meta.env.PROD ||
    typeof navigator === 'undefined' ||
    !('serviceWorker' in navigator)
  ) {
    return null;
  }
  const { registerSW } = await import('virtual:pwa-register');
  const updateServiceWorker = registerSW({ immediate: true, onNeedRefresh });
  return () => updateServiceWorker(true);
};

/**
 * `beforeinstallprompt` is not in the DOM typings (Chromium only): the event
 * is narrowed at runtime, and its `userChoice` is read as untrusted data.
 */
interface InstallPromptEvent extends Event {
  readonly prompt: () => Promise<unknown>;
  readonly userChoice: Promise<unknown>;
}

const isInstallPromptEvent = (event: Event): event is InstallPromptEvent =>
  'prompt' in event &&
  typeof event.prompt === 'function' &&
  'userChoice' in event &&
  event.userChoice instanceof Promise;

const readOutcome = (choice: unknown): PwaInstallOutcome =>
  typeof choice === 'object' &&
  choice !== null &&
  'outcome' in choice &&
  choice.outcome === 'accepted'
    ? 'accepted'
    : 'dismissed';

interface PwaUpdateProviderProps {
  readonly children: ReactNode;
  /** U10: replaces the production registration (tests only). */
  readonly registerServiceWorker?: RegisterServiceWorker | undefined;
}

/**
 * Registers the production service worker once and shares its waiting-update
 * state (L28), plus the browser's install prompt when it offers one (U10).
 * Nothing here reloads the page by itself: only `applyUpdate` does, on demand.
 */
export function PwaUpdateProvider({
  children,
  registerServiceWorker = registerProductionServiceWorker,
}: PwaUpdateProviderProps) {
  const [isUpdateWaiting, setIsUpdateWaiting] = useState(false);
  const [isUpdateDismissed, setIsUpdateDismissed] = useState(false);
  const applyUpdateRef = useRef<ApplyUpdate | null>(null);
  const [installEvent, setInstallEvent] = useState<InstallPromptEvent | null>(null);

  useEffect(() => {
    let isMounted = true;
    registerServiceWorker(() => {
      if (isMounted) setIsUpdateWaiting(true);
    })
      .then((applyUpdate) => {
        if (isMounted) applyUpdateRef.current = applyUpdate;
      })
      .catch(() => {
        if (isMounted) setIsUpdateWaiting(false);
      });

    return () => {
      isMounted = false;
    };
  }, [registerServiceWorker]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const onBeforeInstallPrompt = (event: Event): void => {
      if (!isInstallPromptEvent(event)) return;
      // Keeps the browser's own banner for the moment the player chooses.
      event.preventDefault();
      setInstallEvent(event);
    };
    const onAppInstalled = (): void => {
      setInstallEvent(null);
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onAppInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onAppInstalled);
    };
  }, []);

  const applyUpdate = useCallback((): void => {
    void applyUpdateRef.current?.();
  }, []);
  const dismissUpdate = useCallback((): void => {
    setIsUpdateDismissed(true);
  }, []);
  const install = useCallback(async (): Promise<PwaInstallOutcome> => {
    if (installEvent === null) return 'unavailable';
    setInstallEvent(null);
    try {
      await installEvent.prompt();
      return readOutcome(await installEvent.userChoice);
    } catch {
      return 'unavailable';
    }
  }, [installEvent]);

  const state = useMemo<PwaState>(
    () => ({
      isUpdateWaiting,
      isUpdateDismissed,
      applyUpdate,
      dismissUpdate,
      isInstallAvailable: installEvent !== null,
      install,
    }),
    [isUpdateWaiting, isUpdateDismissed, applyUpdate, dismissUpdate, installEvent, install],
  );

  return <pwaContext.Provider value={state}>{children}</pwaContext.Provider>;
}

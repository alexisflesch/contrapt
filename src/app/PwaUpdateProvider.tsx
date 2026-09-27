import { useEffect, useState, type ReactNode } from 'react';

import { pwaUpdateAvailableContext } from './pwa-update-context';

interface PwaUpdateProviderProps {
  readonly children: ReactNode;
}

/** Registers the production service worker once and shares its waiting-update state. */
export function PwaUpdateProvider({ children }: PwaUpdateProviderProps) {
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    if (
      !import.meta.env.PROD ||
      typeof navigator === 'undefined' ||
      !('serviceWorker' in navigator)
    ) {
      return;
    }

    let isMounted = true;
    void import('virtual:pwa-register')
      .then(({ registerSW }) => {
        registerSW({
          immediate: true,
          onNeedRefresh: () => {
            if (isMounted) setUpdateAvailable(true);
          },
          onRegisterError: () => {
            if (isMounted) setUpdateAvailable(false);
          },
        });
      })
      .catch(() => {
        if (isMounted) setUpdateAvailable(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <pwaUpdateAvailableContext.Provider value={updateAvailable}>
      {children}
    </pwaUpdateAvailableContext.Provider>
  );
}

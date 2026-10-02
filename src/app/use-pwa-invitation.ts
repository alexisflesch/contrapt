import { useState } from 'react';

import { pwaInvitation, type PwaInvitationKind } from './pwa-invitation';
import { usePreferencesRepository } from './preferences-repository-context';
import { usePwa } from './use-pwa';

interface BoardContext {
  /** `usePwaUpdateStatus(session)`: an update waits and the phase is safe. */
  readonly isUpdateOfferable: boolean;
  /** The attempt has changes that the update's reload would lose. */
  readonly hasUnsavedConstruction: boolean;
}

interface PwaInvitationOffer {
  readonly kind: PwaInvitationKind;
  readonly onAccept: () => void;
  readonly onDismiss: () => void;
}

/**
 * U10: the PWA invitation of a screen — a board (`board` given) or the home
 * page (`null`). Declining the install invitation, in the card or in the
 * browser's own prompt, is kept in the local preferences (ADR 0012,
 * amendment of 2 Oct. 2026) with the other preferences untouched; a storage
 * failure only hides it for this visit. « Plus tard » on an update lasts
 * for the visit only.
 */
export function usePwaInvitation(board: BoardContext | null): PwaInvitationOffer | null {
  const pwa = usePwa();
  const preferences = usePreferencesRepository();
  const [isInstallDeclined, setIsInstallDeclined] = useState(() => {
    try {
      const loaded = preferences.load();
      return loaded.status === 'ok' && loaded.preferences.installInvitationDeclined === true;
    } catch {
      return false;
    }
  });

  const kind = pwaInvitation({
    place: board === null ? 'home' : 'board',
    isUpdateOfferable: board === null ? pwa.isUpdateWaiting : board.isUpdateOfferable,
    isUpdateDismissed: pwa.isUpdateDismissed,
    hasUnsavedConstruction: board?.hasUnsavedConstruction ?? false,
    isInstallAvailable: pwa.isInstallAvailable,
    isInstallDeclined,
  });
  if (kind === null) return null;

  const declineInstall = (): void => {
    setIsInstallDeclined(true);
    try {
      const loaded = preferences.load();
      preferences.save({
        ...(loaded.status === 'ok' ? loaded.preferences : {}),
        installInvitationDeclined: true,
      });
    } catch {
      // Best effort: the invitation stays hidden for this visit.
    }
  };

  if (kind === 'update') {
    return { kind, onAccept: pwa.applyUpdate, onDismiss: pwa.dismissUpdate };
  }
  return {
    kind,
    onAccept: () => {
      void pwa.install().then((outcome) => {
        if (outcome === 'dismissed') declineInstall();
      });
    },
    onDismiss: declineInstall,
  };
}

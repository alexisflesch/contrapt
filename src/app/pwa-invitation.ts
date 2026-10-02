/**
 * U10 (ADR 0012): the one discreet PWA invitation a screen shows, if any.
 * A waiting update comes first; the install invitation only appears on the
 * home page, once the browser fired `beforeinstallprompt`, and never again
 * after it was declined.
 */
export type PwaInvitationKind = 'update' | 'install';

interface PwaInvitationInput {
  /** `board`: a plateau screen (status slot); `home`: the landing page. */
  readonly place: 'board' | 'home';
  /** An update waits and the board's phase is safe (`usePwaUpdateStatus`); always safe at home. */
  readonly isUpdateOfferable: boolean;
  /** « Plus tard » was touched during this visit. */
  readonly isUpdateDismissed: boolean;
  /** Board only: the attempt has changes that the update's reload would lose. */
  readonly hasUnsavedConstruction: boolean;
  /** The browser fired a usable `beforeinstallprompt` (Chrome, Android). */
  readonly isInstallAvailable: boolean;
  /** Persisted refusal (`Preferences.installInvitationDeclined`). */
  readonly isInstallDeclined: boolean;
}

export const pwaInvitation = ({
  place,
  isUpdateOfferable,
  isUpdateDismissed,
  hasUnsavedConstruction,
  isInstallAvailable,
  isInstallDeclined,
}: PwaInvitationInput): PwaInvitationKind | null => {
  const wouldLoseConstruction = place === 'board' && hasUnsavedConstruction;
  if (isUpdateOfferable && !isUpdateDismissed && !wouldLoseConstruction) return 'update';
  if (place === 'home' && isInstallAvailable && !isInstallDeclined) return 'install';
  return null;
};

import { Download, RefreshCw, X } from 'lucide-react';

import type { PwaInvitationKind } from '../app/pwa-invitation';
import { Button } from './Button';

const content: Readonly<
  Record<
    PwaInvitationKind,
    {
      readonly region: string;
      readonly text: string;
      readonly action: string;
      readonly dismiss: string;
      readonly Icon: typeof Download;
    }
  >
> = {
  update: {
    region: 'Mise à jour de TinkerBolt',
    text: 'Nouvelle version disponible.',
    action: 'Mettre à jour',
    dismiss: 'Plus tard',
    Icon: RefreshCw,
  },
  install: {
    region: 'Installer TinkerBolt',
    text: 'Installe TinkerBolt pour le retrouver comme une application, même hors ligne.',
    action: 'Installer',
    dismiss: 'Ne pas installer',
    Icon: Download,
  },
};

interface PwaInvitationProps {
  readonly kind: PwaInvitationKind;
  readonly onAccept: () => void;
  readonly onDismiss: () => void;
}

/**
 * U10 (ADR 0012): the discreet, non-blocking PWA invitation. It reuses the
 * card of level 1's hint (U8), in the flow of the page or of the board's
 * status slot, never over the board; one touch closes it.
 */
export function PwaInvitation({ kind, onAccept, onDismiss }: PwaInvitationProps) {
  const { region, text, action, dismiss, Icon } = content[kind];
  return (
    <section className="board-hint pwa-invitation" aria-label={region} data-pwa-invitation={kind}>
      <Icon className="board-hint-icon" size={18} aria-hidden="true" />
      <p className="board-hint-text" aria-live="polite">
        {text}
      </p>
      <div className="pwa-invitation-actions">
        <Button tone="go" onClick={onAccept}>
          {action}
        </Button>
        <button
          className="board-hint-dismiss"
          type="button"
          aria-label={dismiss}
          onClick={onDismiss}
        >
          <X size={18} aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}

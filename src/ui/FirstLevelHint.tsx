import { Lightbulb, X } from 'lucide-react';

import type { FirstLevelHintStep } from '../app/first-level-hint';

const NBSP = ' ';

const messages: Readonly<Record<FirstLevelHintStep, string>> = {
  launch: `Touche «${NBSP}Lancer${NBSP}» pour voir la machine tourner.`,
  drawer: `Prends un objet dans le catalogue, pose-le sur le plateau, puis touche «${NBSP}Lancer${NBSP}».`,
};

interface FirstLevelHintProps {
  readonly step: FirstLevelHintStep;
  readonly onDismiss: () => void;
}

/**
 * U8: level 1's brief hint. It sits in the reserved `.status-slot`, never
 * over the board or the action bar, and one touch on its close button puts
 * it away for good (`BoardShell` reports it).
 */
export function FirstLevelHint({ step, onDismiss }: FirstLevelHintProps) {
  return (
    <section className="board-hint" aria-label="Aide du niveau 1" data-hint-step={step}>
      <Lightbulb className="board-hint-icon" size={18} aria-hidden="true" />
      <p className="board-hint-text" aria-live="polite">
        {messages[step]}
      </p>
      <button
        className="board-hint-dismiss"
        type="button"
        aria-label="Masquer l’aide"
        onClick={onDismiss}
      >
        <X size={18} aria-hidden="true" />
      </button>
    </section>
  );
}

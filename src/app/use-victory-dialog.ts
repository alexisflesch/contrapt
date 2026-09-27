import { useEffect, useState } from 'react';

/** U4b: time left to watch the ball settle in the basket before the dialog covers the scene. */
const VICTORY_DIALOG_DELAY_MILLISECONDS = 600;

const prefersReducedMotion = (): boolean =>
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Opens the victory dialog a short moment after a victory, with a React
 * timer: the simulation is untouched. Under `prefers-reduced-motion` the
 * dialog opens at once, without its entrance animation (`styles.css`).
 * The dialog closes when the victory ends (next launch, « Recommencer »).
 */
export function useVictoryDialog(hasVictory: boolean): {
  readonly isOpen: boolean;
  readonly open: () => void;
  readonly close: () => void;
} {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!hasVictory) return undefined;
    const delay = prefersReducedMotion() ? 0 : VICTORY_DIALOG_DELAY_MILLISECONDS;
    const timer = window.setTimeout(() => {
      setIsOpen(true);
    }, delay);
    return () => {
      window.clearTimeout(timer);
      setIsOpen(false);
    };
  }, [hasVictory]);

  return {
    isOpen: hasVictory && isOpen,
    open: () => {
      setIsOpen(true);
    },
    close: () => {
      setIsOpen(false);
    },
  };
}

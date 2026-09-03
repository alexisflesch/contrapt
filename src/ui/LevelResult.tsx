import type { AttemptFailureReason, AttemptOutcome } from '../domain/attempt-failure-evaluator';

interface LevelResultProps {
  /** How the attempt ended; `null` while none has concluded. */
  readonly outcome: AttemptOutcome | null;
  readonly onReplay: () => void;
  readonly onReset: () => void;
  readonly onReturnToLevels: () => void;
}

/**
 * B2 (plan-remise-en-jeu.md § 4): the two reasons an attempt can be lost, in
 * the player's words. The wording carries the explanation the status word
 * cannot: "Échec" alone never says what went wrong.
 */
const failureExplanations: Record<AttemptFailureReason, string> = {
  'out-of-scene': 'Hors de la scène : la balle a quitté le plateau.',
  timeout: 'Temps écoulé : la balle n’est pas entrée dans le panier.',
};

/**
 * The banner shown once a level's simulation has concluded, won or lost.
 * Renders `null` when there is nothing to show — `App.tsx` mounts this
 * alongside `ContextPanel` inside one shared, always-mounted `.status-slot`
 * (see the note there): the two are mutually exclusive by phase, so a
 * per-component reservation here would double-reserve space nothing ever
 * fills at the same time as the other.
 */
export function LevelResult({ outcome, onReplay, onReset, onReturnToLevels }: LevelResultProps) {
  if (outcome === null) return null;

  if (outcome.outcome === 'lost') {
    return (
      <section className="level-result level-result-failure" aria-label="Résultat du niveau">
        <strong>Échec</strong>
        <p className="level-result-reason">{failureExplanations[outcome.reason]}</p>
        <button className="primary-button" type="button" onClick={onReset}>
          Réinitialiser
        </button>
        <button className="context-action" type="button" onClick={onReturnToLevels}>
          Retour aux niveaux
        </button>
      </section>
    );
  }

  return (
    <section className="level-result level-result-victory" aria-label="Résultat du niveau">
      <strong>Victoire</strong>
      <button className="primary-button" type="button" onClick={onReplay}>
        Rejouer le niveau
      </button>
      <button className="context-action" type="button" onClick={onReturnToLevels}>
        Retour aux niveaux
      </button>
    </section>
  );
}

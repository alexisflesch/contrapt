import type { AttemptFailureReason, AttemptOutcome } from '../domain/attempt-failure-evaluator';

interface LevelResultProps {
  readonly isVisible: boolean;
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

/** The banner shown once a level's simulation has concluded, won or lost. */
export function LevelResult({
  isVisible,
  outcome,
  onReplay,
  onReset,
  onReturnToLevels,
}: LevelResultProps) {
  if (!isVisible || outcome === null) return null;

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

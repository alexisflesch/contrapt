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
 *
 * B5 (plan-remise-en-jeu.md § 4 bis): this always renders `.level-result-
 * slot`, in every phase — including `'construction'`, before "Tester" is
 * even pressed — never `null`. A first attempt at this fix only reserved the
 * slot outside `'construction'` (mounting it when "Tester" is pressed
 * instead of when the result appears), which still moved the resize, just
 * to an earlier moment — confirmed by playing it: `.scene-frame` shrank the
 * instant "Tester" was clicked. Reserving unconditionally, from the
 * component's very first render, is what makes `.scene-frame`'s CSS box
 * genuinely constant for the whole lifetime of the app, not merely "constant
 * once a simulation starts." See `.level-result-slot` in styles.css for the
 * fixed height that makes an empty slot and a filled one the same size.
 */
export function LevelResult({ outcome, onReplay, onReset, onReturnToLevels }: LevelResultProps) {
  if (outcome === null) return <div className="level-result-slot" />;

  if (outcome.outcome === 'lost') {
    return (
      <div className="level-result-slot">
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
      </div>
    );
  }

  return (
    <div className="level-result-slot">
      <section className="level-result level-result-victory" aria-label="Résultat du niveau">
        <strong>Victoire</strong>
        <button className="primary-button" type="button" onClick={onReplay}>
          Rejouer le niveau
        </button>
        <button className="context-action" type="button" onClick={onReturnToLevels}>
          Retour aux niveaux
        </button>
      </section>
    </div>
  );
}

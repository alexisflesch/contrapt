import type { AttemptFailureReason, AttemptOutcome } from '../domain/attempt-failure-evaluator';
import { Button } from './Button';
import { Panel } from './Panel';

interface LevelResultProps {
  /** How the attempt ended; `null` while none has concluded. */
  readonly outcome: AttemptOutcome | null;
  readonly isCreation: boolean;
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
 * Renders `null` when there is nothing to show — `BoardShell` mounts this
 * through `InspectorDrawer` inside one shared, always-mounted `.status-slot`
 * whose size is reserved up front, so the banner appearing never resizes
 * the board (B5).
 */
export function LevelResult({
  outcome,
  isCreation,
  onReplay,
  onReset,
  onReturnToLevels,
}: LevelResultProps) {
  if (outcome === null) return null;

  if (outcome.outcome === 'lost') {
    return (
      <Panel className="level-result level-result-failure" label="Résultat du niveau" title="Échec">
        <p className="level-result-reason">{failureExplanations[outcome.reason]}</p>
        <div className="level-result-actions">
          <Button tone="reset" onClick={onReset}>
            <span aria-hidden="true">↺</span>
            Recommencer
          </Button>
          <Button onClick={onReturnToLevels}>Retour aux niveaux</Button>
        </div>
      </Panel>
    );
  }

  if (isCreation) {
    return (
      <Panel
        className="level-result level-result-victory"
        label="Résultat du niveau"
        title="Victoire"
      >
        <div className="level-result-actions">
          <Button tone="go" onClick={onReset}>
            <span aria-hidden="true">↩</span>
            Retour à l’édition
          </Button>
        </div>
      </Panel>
    );
  }

  return (
    <Panel
      className="level-result level-result-victory"
      label="Résultat du niveau"
      title="Victoire"
    >
      <div className="level-result-actions">
        <Button tone="go" onClick={onReplay}>
          <span aria-hidden="true">↺</span>
          Recommencer
        </Button>
        <Button onClick={onReturnToLevels}>Retour aux niveaux</Button>
      </div>
    </Panel>
  );
}

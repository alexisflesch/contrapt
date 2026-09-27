import type { ChallengeHint } from '../application/progression';
import type { AttemptFailureReason, AttemptOutcome } from '../domain/attempt-failure-evaluator';
import { Button } from './Button';
import { Panel } from './Panel';

/**
 * U4: what a campaign victory adds to the banner (ADR 0010). Absent for the
 * workshop, the demo and shared levels, which only say « Victoire ».
 */
export interface CampaignVictory {
  /** Tier earned by this attempt, from the objects counted at launch. */
  readonly tier: 'resolved' | 'elegant' | 'minimal';
  readonly objectsUsed: number;
  /** Progressive revelation from the saved best result (ADR 0010). */
  readonly hint: ChallengeHint;
  /** Fewer objects than the author's known minimum. */
  readonly isNewRecord: boolean;
  /** Opens the next campaign level; `null` when none exists or it is locked. */
  readonly onNextLevel: (() => void) | null;
}

interface LevelResultProps {
  /** How the attempt ended; `null` while none has concluded. */
  readonly outcome: AttemptOutcome | null;
  readonly isCreation: boolean;
  readonly onReplay: () => void;
  readonly onReset: () => void;
  readonly onReturnToLevels: () => void;
  readonly campaign?: CampaignVictory;
}

const tierLabels: Record<CampaignVictory['tier'], string> = {
  resolved: '✅ Résolu',
  elegant: '⭐ Élégant',
  minimal: '🏆 Minimal',
};

const objectCountLabel = (objectsUsed: number): string => {
  if (objectsUsed === 0) return 'sans poser d’objet.';
  return `avec ${String(objectsUsed)} ${objectsUsed === 1 ? 'objet' : 'objets'}.`;
};

const challengeLabel = ({ hint, isNewRecord }: CampaignVictory): string | null => {
  if (isNewRecord) return 'Nouveau record : moins que le minimum connu !';
  if (hint === null) return null;
  if (hint.nextTier === 'elegant') {
    return `Tu penses pouvoir le faire avec ${String(hint.objectCount)} ?`;
  }
  return `Record à battre : 🏆 avec ${String(hint.objectCount)} ${
    hint.objectCount === 1 ? 'objet' : 'objets'
  }.`;
};

function CampaignSummary({ campaign }: { readonly campaign: CampaignVictory }) {
  const challenge = challengeLabel(campaign);
  return (
    <div className="level-result-summary">
      <p className="level-result-tier">
        <strong>{tierLabels[campaign.tier]}</strong>{' '}
        <span>{objectCountLabel(campaign.objectsUsed)}</span>
      </p>
      {challenge !== null && <p className="level-result-challenge">{challenge}</p>}
    </div>
  );
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
  campaign,
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

  const onNextLevel = campaign?.onNextLevel ?? null;

  return (
    <Panel
      className="level-result level-result-victory"
      label="Résultat du niveau"
      title="Victoire"
      {...(campaign === undefined ? {} : { dataAttributes: { 'data-level-tier': campaign.tier } })}
    >
      {campaign !== undefined && <CampaignSummary campaign={campaign} />}
      <div
        className={`level-result-actions${onNextLevel === null ? '' : ' level-result-actions-three'}`}
      >
        {onNextLevel !== null && (
          <Button tone="go" onClick={onNextLevel}>
            Niveau suivant
            <span aria-hidden="true">→</span>
          </Button>
        )}
        <Button
          tone={onNextLevel === null ? 'go' : 'neutral'}
          className="level-result-replay"
          onClick={onReplay}
        >
          <span aria-hidden="true">↺</span>
          Recommencer
        </Button>
        <Button onClick={onReturnToLevels}>Retour aux niveaux</Button>
      </div>
    </Panel>
  );
}

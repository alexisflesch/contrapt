import { useRef, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';

import { countObjectsUsed, evaluateTier } from '../application/progression';

import { embeddedLevels, nextCampaignLevel } from '../content/embedded-levels';
import { AppFrame } from '../ui/AppFrame';
import type { CampaignVictory } from '../ui/LevelResult';
import { Panel } from '../ui/Panel';
import { BoardShell } from './BoardShell';
import { useCampaignProgress } from './use-campaign-progress';

/**
 * `/levels/:levelId/play` (ADR 0008). `levelId` is the `LevelDocument`'s own
 * `id`, never a separately invented index. An unknown id (stale link, typo)
 * redirects to the level list rather than rendering a broken board.
 */
export function PlayLevelPage() {
  const { levelId } = useParams();
  const navigate = useNavigate();
  const { recordCampaignSuccess, levels: levelProgress } = useCampaignProgress();
  const launchedObjectCountRef = useRef<number | null>(null);
  /** Objects counted at the launch of the last won attempt (U4); `null` otherwise. */
  const [wonObjectCount, setWonObjectCount] = useState<number | null>(null);
  const levelIndex = embeddedLevels.findIndex((level) => level.id === levelId);
  const level = embeddedLevels[levelIndex];

  if (level === undefined) return <Navigate to="/levels" replace />;

  /*
   * U5b (decision, 27 Sept. 2026): a locked level's own URL used to stay
   * playable (L21's original choice). Direct access is now blocked with a
   * simple screen instead of the board — the list already disables
   * "Lancer" for the same level, so the URL must not be a bypass. Editing a
   * locked level (U17, from the list) is untouched by this check: it never
   * reaches this page.
   */
  if (levelProgress[level.id]?.unlocked !== true) {
    return (
      <AppFrame
        title={`Niveau ${String(levelIndex + 1)} · ${level.metadata.title}`}
        subtitle="Niveau verrouillé"
        variant="page"
      >
        <div className="page-content">
          <Panel label="Niveau verrouillé" title="Niveau verrouillé">
            <p className="panel-note" role="status">
              Ce niveau est encore verrouillé.
            </p>
            <Link className="btn btn-neutral" to="/levels">
              Liste des niveaux
            </Link>
          </Panel>
        </div>
      </AppFrame>
    );
  }

  const nextLevel = nextCampaignLevel(level.id);
  const campaignVictory: CampaignVictory | null =
    wonObjectCount === null
      ? null
      : {
          tier: evaluateTier(wonObjectCount, level.challenge),
          objectsUsed: wonObjectCount,
          hint: levelProgress[level.id]?.nextChallengeHint ?? null,
          isNewRecord:
            level.challenge !== undefined && wonObjectCount < level.challenge.minimalObjectCount,
          onNextLevel:
            nextLevel !== undefined && levelProgress[nextLevel.id]?.unlocked === true
              ? () => {
                  setWonObjectCount(null);
                  void navigate(`/levels/${nextLevel.id}/play`);
                }
              : null,
        };

  return (
    <BoardShell
      key={level.id}
      initialDocument={level}
      mode="resolution"
      title={`Niveau ${String(levelIndex + 1)} · ${level.metadata.title}`}
      subtitle="Mode joueur"
      campaignVictory={campaignVictory}
      onSimulationLaunched={(attempt) => {
        launchedObjectCountRef.current = countObjectsUsed(attempt);
        setWonObjectCount(null);
      }}
      onSimulationCompleted={(outcome) => {
        const objectsUsed = launchedObjectCountRef.current;
        launchedObjectCountRef.current = null;
        if (outcome.outcome === 'won' && objectsUsed !== null) {
          recordCampaignSuccess(level.id, objectsUsed);
          setWonObjectCount(objectsUsed);
        }
      }}
    />
  );
}

import { useRef, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';

import type { ConstructionAttempt } from '../application/construction';
import { countObjectsUsed, evaluateTier } from '../application/progression';
import { embeddedLevels, nextCampaignLevel } from '../content/embedded-levels';
import type { LevelDocument } from '../domain/level-document';
import type { CampaignVictory } from '../ui/CampaignVictoryDialog';
import { BoardShell } from './BoardShell';
import { LockedLevelPage } from './LockedLevelPage';
import { useCampaignProgress } from './use-campaign-progress';
import { useRemix } from './use-remix';

/**
 * `/levels/:levelId/play` (ADR 0008). `levelId` is the `LevelDocument`'s own
 * `id`, never a separately invented index. An unknown id (stale link, typo)
 * redirects to the level list rather than rendering a broken board.
 */
export function PlayLevelPage() {
  const { levelId } = useParams();
  const { levels: levelProgress } = useCampaignProgress();
  const levelIndex = embeddedLevels.findIndex((level) => level.id === levelId);
  const level = embeddedLevels[levelIndex];

  if (level === undefined) return <Navigate to="/levels" replace />;

  /*
   * U5b (decision, 27 Sept. 2026): a locked level's own URL used to stay
   * playable (L21's original choice). Direct access is now blocked with a
   * simple screen instead of the board — the list already disables
   * "Lancer" for the same level, so the URL must not be a bypass. Its
   * creation is locked the same way in the editor (M11, ADR 0015).
   */
  if (levelProgress[level.id]?.unlocked !== true) {
    return <LockedLevelPage title={`Niveau ${String(levelIndex + 1)} · ${level.metadata.title}`} />;
  }

  return <CampaignLevelBoard key={level.id} level={level} number={levelIndex + 1} />;
}

interface CampaignLevelBoardProps {
  readonly level: LevelDocument;
  readonly number: number;
}

/**
 * An unlocked campaign level, played: the attempt snapshot taken at launch
 * records the victory (L21) and is what « Remixer » poses (M11).
 */
function CampaignLevelBoard({ level, number }: CampaignLevelBoardProps) {
  const navigate = useNavigate();
  const { recordCampaignSuccess, levels: levelProgress } = useCampaignProgress();
  const launchedAttemptRef = useRef<ConstructionAttempt | null>(null);
  /** The last won attempt, as launched (U4); `null` otherwise. */
  const [wonAttempt, setWonAttempt] = useState<ConstructionAttempt | null>(null);
  const { remix, error: remixError, clearError: clearRemixError } = useRemix(level);
  const wonObjectCount = wonAttempt === null ? null : countObjectsUsed(wonAttempt);

  const nextLevel = nextCampaignLevel(level.id);
  const campaignVictory: CampaignVictory | null =
    wonAttempt === null || wonObjectCount === null
      ? null
      : {
          tier: evaluateTier(wonObjectCount, level.challenge),
          objectsUsed: wonObjectCount,
          hasChallenge: level.challenge !== undefined,
          hint: levelProgress[level.id]?.nextChallengeHint ?? null,
          isNewRecord:
            level.challenge !== undefined && wonObjectCount < level.challenge.minimalObjectCount,
          onNextLevel:
            nextLevel !== undefined && levelProgress[nextLevel.id]?.unlocked === true
              ? () => {
                  setWonAttempt(null);
                  void navigate(`/levels/${nextLevel.id}/play`);
                }
              : null,
          onRemix: () => {
            remix(wonAttempt);
          },
          ...(remixError === undefined ? {} : { remixError }),
        };

  return (
    <BoardShell
      initialDocument={level}
      mode="resolution"
      title={`Niveau ${String(number)} · ${level.metadata.title}`}
      subtitle="Mode joueur"
      campaignVictory={campaignVictory}
      onSimulationLaunched={(attempt) => {
        launchedAttemptRef.current = attempt;
        setWonAttempt(null);
        clearRemixError();
      }}
      onSimulationCompleted={(outcome) => {
        const attempt = launchedAttemptRef.current;
        launchedAttemptRef.current = null;
        if (outcome.outcome === 'won' && attempt !== null) {
          recordCampaignSuccess(level.id, countObjectsUsed(attempt));
          setWonAttempt(attempt);
        }
      }}
    />
  );
}

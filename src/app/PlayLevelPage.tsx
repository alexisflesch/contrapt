import { useRef, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';

import { countObjectsUsed, evaluateTier } from '../application/progression';

import { embeddedLevels, nextCampaignLevel } from '../content/embedded-levels';
import type { CampaignVictory } from '../ui/LevelResult';
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

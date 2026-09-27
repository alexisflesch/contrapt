import { useRef } from 'react';
import { Navigate, useParams } from 'react-router-dom';

import { countObjectsUsed } from '../application/progression';

import { embeddedLevels } from '../content/embedded-levels';
import { BoardShell } from './BoardShell';
import { useCampaignProgress } from './use-campaign-progress';

/**
 * `/levels/:levelId/play` (ADR 0008). `levelId` is the `LevelDocument`'s own
 * `id`, never a separately invented index. An unknown id (stale link, typo)
 * redirects to the level list rather than rendering a broken board.
 */
export function PlayLevelPage() {
  const { levelId } = useParams();
  const { recordCampaignSuccess } = useCampaignProgress();
  const launchedObjectCountRef = useRef<number | null>(null);
  const levelIndex = embeddedLevels.findIndex((level) => level.id === levelId);
  const level = embeddedLevels[levelIndex];

  if (level === undefined) return <Navigate to="/levels" replace />;

  return (
    <BoardShell
      key={level.id}
      initialDocument={level}
      mode="resolution"
      title={`Niveau ${String(levelIndex + 1)} · ${level.metadata.title}`}
      subtitle="Mode joueur"
      onSimulationLaunched={(attempt) => {
        launchedObjectCountRef.current = countObjectsUsed(attempt);
      }}
      onSimulationCompleted={(outcome) => {
        const objectsUsed = launchedObjectCountRef.current;
        launchedObjectCountRef.current = null;
        if (outcome.outcome === 'won' && objectsUsed !== null) {
          recordCampaignSuccess(level.id, objectsUsed);
        }
      }}
    />
  );
}

import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react';

import {
  evaluateTier,
  isLevelUnlocked,
  nextChallengeHint,
  recordSuccess,
  type CampaignProgress,
} from '../application/progression';
import type {
  ProgressRepository,
  ProgressRepositoryErrorCode,
} from '../application/progression/progress-repository';
import { campaignChapters } from '../content/embedded-levels';
import { CampaignProgressContext } from './campaign-progress-context';

interface CampaignProgressProviderProps {
  readonly repository: ProgressRepository;
  /**
   * Dev-mode override, injected from `main.tsx` via `App` (`import.meta.env.DEV`).
   * Defaults to `false` so tests and production builds keep the real lock.
   */
  readonly unlockAllLevels?: boolean;
  readonly children: ReactNode;
}

export function CampaignProgressProvider({
  repository,
  unlockAllLevels = false,
  children,
}: CampaignProgressProviderProps) {
  const [initialResult] = useState(() => repository.load());
  const [progress, setProgress] = useState<CampaignProgress>(() =>
    initialResult.status === 'ok' ? initialResult.progress : {},
  );
  const progressRef = useRef(progress);
  const storagePersistenceRequestedRef = useRef(false);
  const [storageError, setStorageError] = useState<ProgressRepositoryErrorCode | null>(() =>
    initialResult.status === 'error' ? initialResult.code : null,
  );
  const [storageWarning] = useState<'invalid-data-backed-up' | null>(() =>
    initialResult.status === 'ok' ? (initialResult.warning ?? null) : null,
  );

  const recordCampaignSuccess = useCallback(
    (levelId: string, objectsUsed: number): void => {
      const updated = recordSuccess(progressRef.current, levelId, objectsUsed);
      progressRef.current = updated;
      setProgress(updated);

      const result = repository.save(updated);
      setStorageError(result.status === 'error' ? result.code : null);

      if (!storagePersistenceRequestedRef.current) {
        storagePersistenceRequestedRef.current = true;
        try {
          const persistenceRequest =
            typeof navigator === 'undefined' || typeof navigator.storage.persist !== 'function'
              ? undefined
              : navigator.storage.persist();
          if (persistenceRequest !== undefined) void persistenceRequest.catch(() => false);
        } catch {
          // Persistent storage is best effort; a browser refusal must not block play.
        }
      }
    },
    [repository],
  );

  const levels = useMemo(() => {
    const entries = campaignChapters.flatMap(({ levels: chapterLevels }) =>
      chapterLevels.map((level) => {
        const saved = progress[level.id];
        const resolved = saved?.resolved === true;
        const bestObjectCount = saved?.bestObjectCount ?? null;

        return [
          level.id,
          {
            unlocked: unlockAllLevels || isLevelUnlocked(campaignChapters, progress, level.id),
            resolved,
            bestObjectCount,
            tier:
              resolved && bestObjectCount !== null
                ? evaluateTier(bestObjectCount, level.challenge)
                : null,
            nextChallengeHint: resolved
              ? nextChallengeHint(bestObjectCount, level.challenge)
              : null,
          },
        ] as const;
      }),
    );

    return Object.fromEntries(entries);
  }, [progress, unlockAllLevels]);

  const value = useMemo(
    () => ({
      progress,
      levels,
      storageError,
      storageWarning,
      recordCampaignSuccess,
      unlockAllLevels,
    }),
    [levels, progress, recordCampaignSuccess, storageError, storageWarning, unlockAllLevels],
  );

  return (
    <CampaignProgressContext.Provider value={value}>{children}</CampaignProgressContext.Provider>
  );
}

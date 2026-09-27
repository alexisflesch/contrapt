import { createContext } from 'react';

import type { CampaignProgress, ChallengeHint } from '../application/progression';
import type { ProgressRepositoryErrorCode } from '../application/progression/progress-repository';

interface CampaignLevelProgressView {
  readonly unlocked: boolean;
  readonly resolved: boolean;
  readonly bestObjectCount: number | null;
  readonly tier: 'resolved' | 'elegant' | 'minimal' | null;
  readonly nextChallengeHint: ChallengeHint;
}

interface CampaignProgressContextValue {
  readonly progress: CampaignProgress;
  readonly levels: Readonly<Record<string, CampaignLevelProgressView>>;
  readonly storageError: ProgressRepositoryErrorCode | null;
  readonly storageWarning: 'invalid-data-backed-up' | null;
  readonly recordCampaignSuccess: (levelId: string, objectsUsed: number) => void;
  /**
   * Dev-mode override (`pnpm dev`, injected from `main.tsx`): every level
   * reports `unlocked: true` regardless of progress, so the whole campaign
   * can be tested without replaying it. Always `false` in a production
   * build, so Playwright keeps the real lock.
   */
  readonly unlockAllLevels: boolean;
}

export const CampaignProgressContext = createContext<CampaignProgressContextValue | null>(null);

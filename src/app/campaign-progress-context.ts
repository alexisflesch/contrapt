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
}

export const CampaignProgressContext = createContext<CampaignProgressContextValue | null>(null);

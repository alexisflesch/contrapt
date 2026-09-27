import type { CampaignProgress } from './index';

export type ProgressRepositoryErrorCode =
  | 'storage-unavailable'
  | 'quota-exceeded'
  | 'invalid-progress';

export type ProgressLoadResult =
  | {
      readonly status: 'ok';
      readonly progress: CampaignProgress;
      readonly warning?: 'invalid-data-backed-up';
    }
  | { readonly status: 'error'; readonly code: ProgressRepositoryErrorCode };

export type ProgressSaveResult =
  | { readonly status: 'ok' }
  | { readonly status: 'error'; readonly code: ProgressRepositoryErrorCode };

/** Application port for the campaign's small, local progress record. */
export interface ProgressRepository {
  load(): ProgressLoadResult;
  save(progress: CampaignProgress): ProgressSaveResult;
}

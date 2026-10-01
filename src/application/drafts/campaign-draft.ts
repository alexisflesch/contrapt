import type { LevelDocument } from '../../domain/level-document';
import { creationFromLevel } from './creation-from-level';
import type { DraftRepository, DraftRepositoryErrorCode } from './draft-repository';

type OpenCampaignDraftResult =
  | { readonly status: 'ok'; readonly draftId: string }
  | { readonly status: 'error'; readonly code: DraftRepositoryErrorCode };

/** U17: the draft of a campaign level never shares the embedded level's id. */
export const campaignDraftId = (level: LevelDocument): string => `${level.id}-brouillon`;

/**
 * Opens the author's creation of a campaign level: an existing one is reopened
 * as is, so earlier adjustments survive; otherwise a creation is built from
 * the level (ADR 0015, no solution posed) and saved with the level as source.
 */
export const openCampaignDraft = (
  repository: DraftRepository,
  level: LevelDocument,
): OpenCampaignDraftResult => {
  const draftId = campaignDraftId(level);
  const existing = repository.load(draftId);
  if (existing.status === 'ok' && existing.creation !== null) return { status: 'ok', draftId };

  const saved = repository.save(creationFromLevel(level, { createId: () => draftId }));
  return saved.status === 'ok' ? { status: 'ok', draftId } : saved;
};

import type { LevelDocument } from '../../domain/level-document';
import type { DraftRepository, DraftRepositoryErrorCode } from './draft-repository';

type OpenCampaignDraftResult =
  | { readonly status: 'ok'; readonly draftId: string }
  | { readonly status: 'error'; readonly code: DraftRepositoryErrorCode };

/** U17: the draft of a campaign level never shares the embedded level's id. */
export const campaignDraftId = (level: LevelDocument): string => `${level.id}-brouillon`;

/** A copy of a campaign level with a distinct id and title; the original is not touched. */
export const createCampaignDraft = (level: LevelDocument): LevelDocument => ({
  ...structuredClone(level),
  id: campaignDraftId(level),
  metadata: { ...level.metadata, title: `${level.metadata.title} (brouillon)` },
});

/**
 * Opens the author's draft of a campaign level: an existing draft is reopened
 * as is, so earlier adjustments survive; otherwise a fresh copy is saved.
 */
export const openCampaignDraft = (
  repository: DraftRepository,
  level: LevelDocument,
): OpenCampaignDraftResult => {
  const draftId = campaignDraftId(level);
  const existing = repository.load(draftId);
  if (existing.status === 'ok' && existing.document !== null) return { status: 'ok', draftId };

  const saved = repository.save(createCampaignDraft(level));
  return saved.status === 'ok' ? { status: 'ok', draftId } : saved;
};

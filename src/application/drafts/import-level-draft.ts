import type { LevelDocument } from '../../domain/level-document';
import type { DraftRepository, DraftRepositoryErrorCode } from './draft-repository';

type ImportLevelDraftResult =
  | { readonly status: 'ok'; readonly draftId: string }
  | { readonly status: 'error'; readonly code: DraftRepositoryErrorCode };

const MAX_DRAFT_ID_ATTEMPTS = 10;

/** Save an imported level as a fresh local draft, preserving every existing draft. */
export const importLevelAsDraft = (
  repository: DraftRepository,
  document: LevelDocument,
  createId: () => string,
): ImportLevelDraftResult => {
  const index = repository.list();
  if (index.status === 'error') return index;

  const existingIds = new Set(index.ids);
  for (let attempt = 0; attempt < MAX_DRAFT_ID_ATTEMPTS; attempt += 1) {
    let draftId: string;
    try {
      draftId = `import-${createId()}`;
    } catch {
      return { status: 'error', code: 'invalid-draft' };
    }
    if (existingIds.has(draftId)) continue;

    const existingDraft = repository.load(draftId);
    if (existingDraft.status === 'error') return existingDraft;
    if (existingDraft.document !== null) continue;

    const saved = repository.save({ ...document, id: draftId });
    return saved.status === 'ok' ? { status: 'ok', draftId } : saved;
  }

  return { status: 'error', code: 'invalid-draft' };
};

import type { DraftRepository, DraftRepositoryErrorCode } from './draft-repository';

type FreeCreationIdResult =
  | { readonly status: 'ok'; readonly draftId: string }
  | { readonly status: 'error'; readonly code: DraftRepositoryErrorCode };

const MAX_ID_ATTEMPTS = 10;

/**
 * ADR 0015 § Identifiants: a `creation-<aléa>` no creation uses yet, the
 * random part injected. A taken identifier draws again, a few times at most.
 */
export const freeCreationId = (
  repository: DraftRepository,
  createId: () => string,
): FreeCreationIdResult => {
  for (let attempt = 0; attempt < MAX_ID_ATTEMPTS; attempt += 1) {
    const draftId = `creation-${createId()}`;
    const existing = repository.load(draftId);
    if (existing.status === 'error') return existing;
    if (existing.creation === null) return { status: 'ok', draftId };
  }
  return { status: 'error', code: 'invalid-draft' };
};

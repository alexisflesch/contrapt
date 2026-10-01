import type { LevelDocument } from '../../domain/level-document';
import type {
  DraftRepository,
  DraftRepositoryErrorCode,
  DraftWriteResult,
} from './draft-repository';
import { freeCreationId } from './free-creation-id';

type StartFreeCreationResult =
  | { readonly status: 'ok'; readonly draftId: string }
  | { readonly status: 'error'; readonly code: DraftRepositoryErrorCode };

/**
 * ADR 0015 § Atelier libre: a creation is stored under its own identifier,
 * whatever the workshop document it comes from is called. No source: a
 * creation made from nothing has none.
 */
export const saveFreeCreation = (
  repository: DraftRepository,
  draftId: string,
  document: LevelDocument,
): DraftWriteResult => repository.save({ document: { ...document, id: draftId } });

/**
 * ADR 0015 § Atelier libre: the first committed change of the free workshop
 * becomes a new `creation-<aléa>` (random part injected). An error leaves
 * nothing stored; the caller tries again at the next change.
 */
export const startFreeCreation = (
  repository: DraftRepository,
  document: LevelDocument,
  createId: () => string,
): StartFreeCreationResult => {
  const free = freeCreationId(repository, createId);
  if (free.status === 'error') return free;
  const saved = saveFreeCreation(repository, free.draftId, document);
  return saved.status === 'ok' ? { status: 'ok', draftId: free.draftId } : saved;
};

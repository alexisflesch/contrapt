import type { DraftRepository, DraftRepositoryErrorCode } from './draft-repository';
import { freeCreationId } from './free-creation-id';
import { withTitleSuffix } from './title-suffix';

type DuplicateCreationResult =
  | { readonly status: 'ok'; readonly draftId: string }
  | { readonly status: 'error'; readonly code: DraftRepositoryErrorCode };

const COPY_SUFFIX = ' (copie)';

/**
 * ADR 0015 § Page « Mes niveaux »: « Dupliquer » saves a copy of a creation
 * as a new `creation-<aléa>` (random part injected), titled « (copie) », with
 * the same source. The original is left untouched; the repository dates the
 * copy with its own clock.
 */
export const duplicateCreation = (
  repository: DraftRepository,
  id: string,
  createId: () => string,
): DuplicateCreationResult => {
  const original = repository.load(id);
  if (original.status === 'error') return original;
  if (original.creation === null) return { status: 'error', code: 'invalid-draft' };
  const { document, source } = original.creation;

  const free = freeCreationId(repository, createId);
  if (free.status === 'error') return free;
  const { draftId } = free;

  const saved = repository.save({
    document: {
      ...document,
      id: draftId,
      metadata: {
        ...document.metadata,
        title: withTitleSuffix(document.metadata.title, COPY_SUFFIX),
      },
    },
    ...(source === undefined ? {} : { source }),
  });
  return saved.status === 'ok' ? { status: 'ok', draftId } : saved;
};

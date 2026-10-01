import type { LevelDocument, Solution } from '../../domain/level-document';
import { creationFromLevel } from './creation-from-level';
import type { DraftRepository, DraftRepositoryErrorCode } from './draft-repository';
import { freeCreationId } from './free-creation-id';

type SaveCreationFromLevelResult =
  | { readonly status: 'ok'; readonly draftId: string }
  | { readonly status: 'error'; readonly code: DraftRepositoryErrorCode };

interface SaveCreationFromLevelOptions {
  /** The player's winning solution, posed to place (ADR 0015 § Points d'entrée). */
  readonly playerSolution?: Solution;
  /** The random part of `creation-<aléa>`, injected. */
  readonly createId: () => string;
}

/**
 * ADR 0015 § Points d'entrée: « Modifier » a received level and « Remixer »
 * after a victory save a new `creation-<aléa>` built from the level, the
 * player's solution posed to place when there is one. A storage failure is
 * a result, never an exception.
 */
export const saveCreationFromLevel = (
  repository: DraftRepository,
  level: LevelDocument,
  { playerSolution, createId }: SaveCreationFromLevelOptions,
): SaveCreationFromLevelResult => {
  const free = freeCreationId(repository, createId);
  if (free.status === 'error') return free;
  const { draftId } = free;

  const saved = repository.save(
    creationFromLevel(level, {
      ...(playerSolution === undefined ? {} : { playerSolution }),
      createId: () => draftId,
    }),
  );
  return saved.status === 'ok' ? { status: 'ok', draftId } : saved;
};

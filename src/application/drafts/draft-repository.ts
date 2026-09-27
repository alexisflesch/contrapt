import type { LevelDocument } from '../../domain/level-document';

export type DraftRepositoryErrorCode = 'storage-unavailable' | 'quota-exceeded' | 'invalid-draft';

export type DraftRepositoryWarning = 'invalid-data-backed-up';

export type DraftIndexLoadResult =
  | {
      readonly status: 'ok';
      readonly ids: readonly string[];
      readonly warning?: DraftRepositoryWarning;
    }
  | { readonly status: 'error'; readonly code: DraftRepositoryErrorCode };

export type DraftLoadResult =
  | {
      readonly status: 'ok';
      readonly document: LevelDocument | null;
      readonly warning?: DraftRepositoryWarning;
    }
  | { readonly status: 'error'; readonly code: DraftRepositoryErrorCode };

export type DraftWriteResult =
  | { readonly status: 'ok'; readonly warning?: DraftRepositoryWarning }
  | { readonly status: 'error'; readonly code: DraftRepositoryErrorCode };

/** Application port for author-created levels stored locally. */
export interface DraftRepository {
  list(): DraftIndexLoadResult;
  load(id: string): DraftLoadResult;
  save(document: LevelDocument): DraftWriteResult;
  delete(id: string): DraftWriteResult;
}

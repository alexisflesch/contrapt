import type { LevelDocument, Solution } from '../../domain/level-document';

/** A level received by link or file (ADR 0015): frozen, played, never edited. */
export interface ReceivedLevel {
  /** `recu-<empreinte>` (ADR 0015 § Empreinte et doublons). */
  readonly id: string;
  /** The document as received, puzzle shape. */
  readonly document: LevelDocument;
  readonly origin: 'link' | 'file';
  /** ISO 8601 instant supplied by the caller's injected clock. */
  readonly receivedAt: string;
  readonly solved: boolean;
  /** Same definition as ADR 0010; only for a solved level. */
  readonly bestObjectCount?: number;
  /** Last winning attempt, ADR 0013 `solution` shape; only for a solved level. */
  readonly playerSolution?: Solution;
}

export type ReceivedLevelRepositoryErrorCode =
  | 'storage-unavailable'
  | 'quota-exceeded'
  | 'invalid-received-level';

export type ReceivedLevelRepositoryWarning = 'invalid-data-backed-up';

export type ReceivedLevelIndexLoadResult =
  | {
      readonly status: 'ok';
      readonly ids: readonly string[];
      readonly warning?: ReceivedLevelRepositoryWarning;
    }
  | { readonly status: 'error'; readonly code: ReceivedLevelRepositoryErrorCode };

export type ReceivedLevelLoadResult =
  | {
      readonly status: 'ok';
      readonly level: ReceivedLevel | null;
      readonly warning?: ReceivedLevelRepositoryWarning;
    }
  | { readonly status: 'error'; readonly code: ReceivedLevelRepositoryErrorCode };

export type ReceivedLevelWriteResult =
  | { readonly status: 'ok'; readonly warning?: ReceivedLevelRepositoryWarning }
  | { readonly status: 'error'; readonly code: ReceivedLevelRepositoryErrorCode };

/** Application port for levels received by link or file, stored locally. */
export interface ReceivedLevelRepository {
  list(): ReceivedLevelIndexLoadResult;
  load(id: string): ReceivedLevelLoadResult;
  save(level: ReceivedLevel): ReceivedLevelWriteResult;
  delete(id: string): ReceivedLevelWriteResult;
}

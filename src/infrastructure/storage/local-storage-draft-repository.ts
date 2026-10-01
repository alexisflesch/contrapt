import { z } from 'zod';

import type { LevelDocument } from '../../domain/level-document';
import type {
  DraftCreation,
  DraftCreationContent,
  DraftIndexLoadResult,
  DraftLoadResult,
  DraftRepository,
  DraftRepositoryErrorCode,
  DraftRepositoryWarning,
  DraftWriteResult,
} from '../../application/drafts/draft-repository';
import {
  decodeLevelFile,
  encodeLevelFile,
  MAX_LEVEL_FILE_SIZE_BYTES,
} from '../level-file/level-file-codec';

const DRAFTS_INDEX_KEY = 'tinkerbolt:drafts';
const DRAFTS_INDEX_BACKUP_KEY = 'tinkerbolt:backup:drafts';
const MAX_DRAFT_VALUE_CHARACTERS = MAX_LEVEL_FILE_SIZE_BYTES * 4;
type DraftRepositoryFailure = Extract<DraftWriteResult, { readonly status: 'error' }>;

const draftIdSchema = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/);

const draftIndexEnvelopeSchema = z.strictObject({
  kind: z.literal('draft-index'),
  version: z.literal(1),
  data: z.strictObject({
    ids: z.array(draftIdSchema).refine((ids) => new Set(ids).size === ids.length),
  }),
});

/** L26 drafts: the level file codec text, stored as a string. Read only. */
const draftEnvelopeV1Schema = z.strictObject({
  kind: z.literal('draft'),
  version: z.literal(1),
  data: z.strictObject({
    levelFile: z.string().max(MAX_LEVEL_FILE_SIZE_BYTES * 3),
  }),
});

/**
 * Creations (ADR 0015): `document` and `source` are the JSON values of the level
 * file codec text, decoded again by that codec (migrations included), as for
 * received levels.
 */
const draftEnvelopeV2Schema = z.strictObject({
  kind: z.literal('draft'),
  version: z.literal(2),
  data: z.strictObject({
    document: z.record(z.string(), z.unknown()),
    source: z.record(z.string(), z.unknown()).optional(),
    updatedAt: z.iso.datetime({ offset: true }),
  }),
});

const draftEnvelopeSchema = z.discriminatedUnion('version', [
  draftEnvelopeV1Schema,
  draftEnvelopeV2Schema,
]);

/** A v1 draft has no date: the caller dates it when it is read (migration). */
type StoredDraft =
  | { readonly version: 1; readonly document: LevelDocument }
  | { readonly version: 2; readonly creation: DraftCreation };

type DraftIndexReadResult =
  | {
      readonly status: 'ok';
      readonly ids: readonly string[];
      readonly needsRepair: boolean;
      readonly warning?: DraftRepositoryWarning;
    }
  | { readonly status: 'error'; readonly code: DraftRepositoryErrorCode };

const storageError = (error: unknown): DraftRepositoryFailure => ({
  status: 'error',
  code:
    error instanceof Error && error.name === 'QuotaExceededError'
      ? 'quota-exceeded'
      : 'storage-unavailable',
});

const draftStorageKey = (id: string): string => `tinkerbolt:draft:${id}`;
const draftBackupKey = (id: string): string => `tinkerbolt:backup:draft:${id}`;

const parseJson = (text: string): unknown => {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
};

const encodeIndex = (ids: readonly string[]): string =>
  JSON.stringify({ kind: 'draft-index', version: 1, data: { ids } });

const decodeIndex = (rawValue: string): readonly string[] | null => {
  const parsed = draftIndexEnvelopeSchema.safeParse(parseJson(rawValue));
  return parsed.success ? parsed.data.data.ids : null;
};

const decodeStoredDocument = (value: unknown): LevelDocument | null => {
  const fileResult = decodeLevelFile(typeof value === 'string' ? value : JSON.stringify(value));
  return fileResult.status === 'ok' ? fileResult.document : null;
};

const decodeStoredDraft = (rawValue: string, expectedId: string): StoredDraft | null => {
  if (rawValue.length > MAX_DRAFT_VALUE_CHARACTERS) return null;

  const parsed = draftEnvelopeSchema.safeParse(parseJson(rawValue));
  if (!parsed.success) return null;

  if (parsed.data.version === 1) {
    const document = decodeStoredDocument(parsed.data.data.levelFile);
    return document !== null && document.id === expectedId ? { version: 1, document } : null;
  }

  const { document: storedDocument, source: storedSource, updatedAt } = parsed.data.data;
  const document = decodeStoredDocument(storedDocument);
  if (document === null || document.id !== expectedId) return null;
  if (storedSource === undefined) return { version: 2, creation: { document, updatedAt } };

  const source = decodeStoredDocument(storedSource);
  return source === null ? null : { version: 2, creation: { document, source, updatedAt } };
};

/** The injected clock's instant in ISO 8601, or null for an invalid date. */
const currentInstant = (now: () => Date): string | null => {
  try {
    const instant = now().toISOString();
    return z.iso.datetime({ offset: true }).safeParse(instant).success ? instant : null;
  } catch {
    return null;
  }
};

const toStoredJson = (document: LevelDocument): unknown => JSON.parse(encodeLevelFile(document));

/** Serialize a v2 envelope, or return null when it would not be read back as valid. */
const encodeStoredDraft = (creation: DraftCreationContent, updatedAt: string): string | null => {
  try {
    const envelope = {
      kind: 'draft',
      version: 2,
      data: {
        document: toStoredJson(creation.document),
        ...(creation.source === undefined ? {} : { source: toStoredJson(creation.source) }),
        updatedAt,
      },
    };
    return draftEnvelopeV2Schema.safeParse(envelope).success ? JSON.stringify(envelope) : null;
  } catch {
    return null;
  }
};

const readIndex = (storage: Storage): DraftIndexReadResult => {
  let rawValue: string | null;
  try {
    rawValue = storage.getItem(DRAFTS_INDEX_KEY);
  } catch (error) {
    return storageError(error);
  }

  if (rawValue === null) return { status: 'ok', ids: [], needsRepair: false };

  const ids = decodeIndex(rawValue);
  if (ids !== null) return { status: 'ok', ids, needsRepair: false };

  try {
    storage.setItem(DRAFTS_INDEX_BACKUP_KEY, rawValue);
  } catch (error) {
    return storageError(error);
  }

  return {
    status: 'ok',
    ids: [],
    needsRepair: true,
    warning: 'invalid-data-backed-up',
  };
};

const backupValue = (
  storage: Storage,
  key: string,
  rawValue: string,
): DraftRepositoryFailure | null => {
  try {
    storage.setItem(key, rawValue);
    return null;
  } catch (error) {
    return storageError(error);
  }
};

const successfulWrite = (warning: boolean): DraftWriteResult =>
  warning ? { status: 'ok', warning: 'invalid-data-backed-up' } : { status: 'ok' };

const repositoryError = (result: DraftRepositoryFailure): DraftWriteResult => result;

/**
 * Create the localStorage adapter around an explicitly injected Storage object
 * and clock; the clock dates every save and every v1 draft read (migration).
 */
export const createLocalStorageDraftRepository = (
  storage: Storage,
  now: () => Date,
): DraftRepository => ({
  list(): DraftIndexLoadResult {
    const result = readIndex(storage);
    if (result.status === 'error') return result;
    return {
      status: 'ok',
      ids: result.ids,
      ...(result.warning === undefined ? {} : { warning: result.warning }),
    };
  },

  load(id: string): DraftLoadResult {
    if (!draftIdSchema.safeParse(id).success) return { status: 'error', code: 'invalid-draft' };

    let rawValue: string | null;
    try {
      rawValue = storage.getItem(draftStorageKey(id));
    } catch (error) {
      return storageError(error);
    }
    if (rawValue === null) return { status: 'ok', creation: null };

    const stored = decodeStoredDraft(rawValue, id);
    if (stored?.version === 2) return { status: 'ok', creation: stored.creation };
    if (stored?.version === 1) {
      // ADR 0015 § Stockage local: a v1 draft is dated at the instant of its migration.
      const updatedAt = currentInstant(now);
      if (updatedAt === null) return { status: 'error', code: 'invalid-draft' };
      return { status: 'ok', creation: { document: stored.document, updatedAt } };
    }

    const backup = backupValue(storage, draftBackupKey(id), rawValue);
    if (backup !== null) return backup;
    return { status: 'ok', creation: null, warning: 'invalid-data-backed-up' };
  },

  save(creation: DraftCreationContent): DraftWriteResult {
    const { document } = creation;
    if (!draftIdSchema.safeParse(document.id).success) {
      return { status: 'error', code: 'invalid-draft' };
    }

    const updatedAt = currentInstant(now);
    if (updatedAt === null) return { status: 'error', code: 'invalid-draft' };

    const serializedDraft = encodeStoredDraft(creation, updatedAt);
    if (serializedDraft === null) return { status: 'error', code: 'invalid-draft' };

    const key = draftStorageKey(document.id);
    let previousDraft: string | null;
    try {
      previousDraft = storage.getItem(key);
    } catch (error) {
      return storageError(error);
    }

    let warning = false;
    if (previousDraft !== null && decodeStoredDraft(previousDraft, document.id) === null) {
      const backup = backupValue(storage, draftBackupKey(document.id), previousDraft);
      if (backup !== null) return repositoryError(backup);
      warning = true;
    }

    const index = readIndex(storage);
    if (index.status === 'error') return repositoryError(index);
    warning ||= index.warning !== undefined;

    const nextIds = index.ids.includes(document.id) ? index.ids : [...index.ids, document.id];
    const serializedIndex = encodeIndex(nextIds);

    try {
      storage.setItem(key, serializedDraft);
    } catch (error) {
      return storageError(error);
    }

    try {
      storage.setItem(DRAFTS_INDEX_KEY, serializedIndex);
    } catch (error) {
      try {
        if (previousDraft === null) storage.removeItem(key);
        else storage.setItem(key, previousDraft);
      } catch {
        // Best-effort rollback; report the original storage error either way.
      }
      return storageError(error);
    }

    return successfulWrite(warning);
  },

  delete(id: string): DraftWriteResult {
    if (!draftIdSchema.safeParse(id).success) return { status: 'error', code: 'invalid-draft' };

    const index = readIndex(storage);
    if (index.status === 'error') return repositoryError(index);
    let warning = index.warning !== undefined;

    const key = draftStorageKey(id);
    let previousDraft: string | null;
    try {
      previousDraft = storage.getItem(key);
    } catch (error) {
      return storageError(error);
    }

    if (previousDraft !== null && decodeStoredDraft(previousDraft, id) === null) {
      const backup = backupValue(storage, draftBackupKey(id), previousDraft);
      if (backup !== null) return repositoryError(backup);
      warning = true;
    }

    const nextIds = index.ids.filter((candidateId) => candidateId !== id);
    const shouldWriteIndex = index.needsRepair || nextIds.length !== index.ids.length;
    if (previousDraft === null && !shouldWriteIndex) return successfulWrite(warning);

    if (previousDraft !== null) {
      try {
        storage.removeItem(key);
      } catch (error) {
        return storageError(error);
      }
    }

    if (shouldWriteIndex) {
      try {
        storage.setItem(DRAFTS_INDEX_KEY, encodeIndex(nextIds));
      } catch (error) {
        if (previousDraft !== null) {
          try {
            storage.setItem(key, previousDraft);
          } catch {
            // Best-effort rollback; report the original storage error either way.
          }
        }
        return storageError(error);
      }
    }

    return successfulWrite(warning);
  },
});

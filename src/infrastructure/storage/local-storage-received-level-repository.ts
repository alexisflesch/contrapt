import { z } from 'zod';

import { solutionSchema } from '../../domain/level-document';
import type {
  ReceivedLevel,
  ReceivedLevelIndexLoadResult,
  ReceivedLevelLoadResult,
  ReceivedLevelRepository,
  ReceivedLevelRepositoryErrorCode,
  ReceivedLevelRepositoryWarning,
  ReceivedLevelWriteResult,
} from '../../application/received/received-level-repository';
import {
  decodeLevelFile,
  encodeLevelFile,
  MAX_LEVEL_FILE_SIZE_BYTES,
} from '../level-file/level-file-codec';

const RECEIVED_INDEX_KEY = 'tinkerbolt:received';
const RECEIVED_INDEX_BACKUP_KEY = 'tinkerbolt:backup:received';
const MAX_RECEIVED_VALUE_CHARACTERS = MAX_LEVEL_FILE_SIZE_BYTES * 4;
type ReceivedLevelRepositoryFailure = Extract<
  ReceivedLevelWriteResult,
  { readonly status: 'error' }
>;

/** `recu-<empreinte>`: 16 lowercase hexadecimal digits (ADR 0015 § Empreinte et doublons). */
const receivedIdSchema = z.string().regex(/^recu-[0-9a-f]{16}$/);

const receivedIndexEnvelopeSchema = z.strictObject({
  kind: z.literal('received-index'),
  version: z.literal(1),
  data: z.strictObject({
    ids: z.array(receivedIdSchema).refine((ids) => new Set(ids).size === ids.length),
  }),
});

/**
 * Stored entry: the level document is kept as the JSON value of the level file
 * codec text and is decoded again by that codec (migrations included).
 */
const storedReceivedLevelSchema = z
  .strictObject({
    id: receivedIdSchema,
    document: z.record(z.string(), z.unknown()),
    origin: z.enum(['link', 'file']),
    receivedAt: z.iso.datetime({ offset: true }),
    solved: z.boolean(),
    bestObjectCount: z.int().nonnegative().max(Number.MAX_SAFE_INTEGER).optional(),
    playerSolution: solutionSchema.optional(),
  })
  .refine(
    ({ solved, bestObjectCount, playerSolution }) =>
      solved || (bestObjectCount === undefined && playerSolution === undefined),
    'Un niveau non résolu n’a ni record ni solution du joueur.',
  );

const receivedEnvelopeSchema = z.strictObject({
  kind: z.literal('received-level'),
  version: z.literal(1),
  data: storedReceivedLevelSchema,
});

type ReceivedIndexReadResult =
  | {
      readonly status: 'ok';
      readonly ids: readonly string[];
      readonly needsRepair: boolean;
      readonly warning?: ReceivedLevelRepositoryWarning;
    }
  | { readonly status: 'error'; readonly code: ReceivedLevelRepositoryErrorCode };

const storageError = (error: unknown): ReceivedLevelRepositoryFailure => ({
  status: 'error',
  code:
    error instanceof Error && error.name === 'QuotaExceededError'
      ? 'quota-exceeded'
      : 'storage-unavailable',
});

const invalidLevel: ReceivedLevelRepositoryFailure = {
  status: 'error',
  code: 'invalid-received-level',
};

const receivedStorageKey = (id: string): string => `tinkerbolt:received:${id}`;
const receivedBackupKey = (id: string): string => `tinkerbolt:backup:received:${id}`;

const parseJson = (text: string): unknown => {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
};

const encodeIndex = (ids: readonly string[]): string =>
  JSON.stringify({ kind: 'received-index', version: 1, data: { ids } });

const decodeIndex = (rawValue: string): readonly string[] | null => {
  const parsed = receivedIndexEnvelopeSchema.safeParse(parseJson(rawValue));
  return parsed.success ? parsed.data.data.ids : null;
};

const decodeStoredLevel = (rawValue: string, expectedId: string): ReceivedLevel | null => {
  if (rawValue.length > MAX_RECEIVED_VALUE_CHARACTERS) return null;

  const parsed = receivedEnvelopeSchema.safeParse(parseJson(rawValue));
  if (!parsed.success || parsed.data.data.id !== expectedId) return null;

  const { document, bestObjectCount, playerSolution, ...rest } = parsed.data.data;
  const fileResult = decodeLevelFile(JSON.stringify(document));
  if (fileResult.status !== 'ok') return null;

  return {
    ...rest,
    document: fileResult.document,
    ...(bestObjectCount === undefined ? {} : { bestObjectCount }),
    ...(playerSolution === undefined ? {} : { playerSolution }),
  };
};

/** Serialize an entry, or return null when it would not be read back as valid. */
const encodeStoredLevel = (level: ReceivedLevel): string | null => {
  let document: unknown;
  try {
    document = JSON.parse(encodeLevelFile(level.document));
  } catch {
    return null;
  }

  const envelope = { kind: 'received-level', version: 1, data: { ...level, document } };
  if (!receivedEnvelopeSchema.safeParse(envelope).success) return null;

  try {
    return JSON.stringify(envelope);
  } catch {
    return null;
  }
};

const readIndex = (storage: Storage): ReceivedIndexReadResult => {
  let rawValue: string | null;
  try {
    rawValue = storage.getItem(RECEIVED_INDEX_KEY);
  } catch (error) {
    return storageError(error);
  }

  if (rawValue === null) return { status: 'ok', ids: [], needsRepair: false };

  const ids = decodeIndex(rawValue);
  if (ids !== null) return { status: 'ok', ids, needsRepair: false };

  try {
    storage.setItem(RECEIVED_INDEX_BACKUP_KEY, rawValue);
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
): ReceivedLevelRepositoryFailure | null => {
  try {
    storage.setItem(key, rawValue);
    return null;
  } catch (error) {
    return storageError(error);
  }
};

const successfulWrite = (warning: boolean): ReceivedLevelWriteResult =>
  warning ? { status: 'ok', warning: 'invalid-data-backed-up' } : { status: 'ok' };

/** Create the localStorage adapter around an explicitly injected Storage object. */
export const createLocalStorageReceivedLevelRepository = (
  storage: Storage,
): ReceivedLevelRepository => ({
  list(): ReceivedLevelIndexLoadResult {
    const result = readIndex(storage);
    if (result.status === 'error') return result;
    return {
      status: 'ok',
      ids: result.ids,
      ...(result.warning === undefined ? {} : { warning: result.warning }),
    };
  },

  load(id: string): ReceivedLevelLoadResult {
    if (!receivedIdSchema.safeParse(id).success) return invalidLevel;

    let rawValue: string | null;
    try {
      rawValue = storage.getItem(receivedStorageKey(id));
    } catch (error) {
      return storageError(error);
    }
    if (rawValue === null) return { status: 'ok', level: null };

    const level = decodeStoredLevel(rawValue, id);
    if (level !== null) return { status: 'ok', level };

    const backup = backupValue(storage, receivedBackupKey(id), rawValue);
    if (backup !== null) return backup;
    return { status: 'ok', level: null, warning: 'invalid-data-backed-up' };
  },

  save(level: ReceivedLevel): ReceivedLevelWriteResult {
    const serializedLevel = encodeStoredLevel(level);
    if (serializedLevel === null) return invalidLevel;

    const key = receivedStorageKey(level.id);
    let previousValue: string | null;
    try {
      previousValue = storage.getItem(key);
    } catch (error) {
      return storageError(error);
    }

    let warning = false;
    if (previousValue !== null && decodeStoredLevel(previousValue, level.id) === null) {
      const backup = backupValue(storage, receivedBackupKey(level.id), previousValue);
      if (backup !== null) return backup;
      warning = true;
    }

    const index = readIndex(storage);
    if (index.status === 'error') return index;
    warning ||= index.warning !== undefined;

    const nextIds = index.ids.includes(level.id) ? index.ids : [...index.ids, level.id];

    try {
      storage.setItem(key, serializedLevel);
    } catch (error) {
      return storageError(error);
    }

    try {
      storage.setItem(RECEIVED_INDEX_KEY, encodeIndex(nextIds));
    } catch (error) {
      try {
        if (previousValue === null) storage.removeItem(key);
        else storage.setItem(key, previousValue);
      } catch {
        // Best-effort rollback; report the original storage error either way.
      }
      return storageError(error);
    }

    return successfulWrite(warning);
  },

  delete(id: string): ReceivedLevelWriteResult {
    if (!receivedIdSchema.safeParse(id).success) return invalidLevel;

    const index = readIndex(storage);
    if (index.status === 'error') return index;
    let warning = index.warning !== undefined;

    const key = receivedStorageKey(id);
    let previousValue: string | null;
    try {
      previousValue = storage.getItem(key);
    } catch (error) {
      return storageError(error);
    }

    if (previousValue !== null && decodeStoredLevel(previousValue, id) === null) {
      const backup = backupValue(storage, receivedBackupKey(id), previousValue);
      if (backup !== null) return backup;
      warning = true;
    }

    const nextIds = index.ids.filter((candidateId) => candidateId !== id);
    const shouldWriteIndex = index.needsRepair || nextIds.length !== index.ids.length;
    if (previousValue === null && !shouldWriteIndex) return successfulWrite(warning);

    if (previousValue !== null) {
      try {
        storage.removeItem(key);
      } catch (error) {
        return storageError(error);
      }
    }

    if (shouldWriteIndex) {
      try {
        storage.setItem(RECEIVED_INDEX_KEY, encodeIndex(nextIds));
      } catch (error) {
        if (previousValue !== null) {
          try {
            storage.setItem(key, previousValue);
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

import { z } from 'zod';

import type { CampaignProgress } from '../../application/progression';
import type {
  ProgressLoadResult,
  ProgressRepository,
  ProgressRepositoryErrorCode,
  ProgressSaveResult,
} from '../../application/progression/progress-repository';

const PROGRESS_KEY = 'tinkerbolt:progress';
const PROGRESS_BACKUP_KEY = 'tinkerbolt:backup:progress';

const levelProgressSchema = z
  .strictObject({
    resolved: z.boolean(),
    bestObjectCount: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER).nullable(),
  })
  .refine(
    ({ resolved, bestObjectCount }) => resolved === (bestObjectCount !== null),
    'Un niveau résolu doit avoir un record, et un niveau non résolu ne doit pas en avoir.',
  );

const levelIdSchema = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/);
const campaignProgressSchema = z.record(levelIdSchema, levelProgressSchema);
const progressEnvelopeSchema = z.strictObject({
  kind: z.literal('progress'),
  version: z.literal(1),
  data: campaignProgressSchema,
});

const emptyProgress: CampaignProgress = {};

const isValidProgressEnvelope = (rawValue: string): boolean => {
  try {
    return progressEnvelopeSchema.safeParse(JSON.parse(rawValue) as unknown).success;
  } catch {
    return false;
  }
};

const errorCodeFor = (error: unknown): ProgressRepositoryErrorCode =>
  error instanceof Error && error.name === 'QuotaExceededError'
    ? 'quota-exceeded'
    : 'storage-unavailable';

const storageError = (
  error: unknown,
): { readonly status: 'error'; readonly code: ProgressRepositoryErrorCode } => ({
  status: 'error',
  code: errorCodeFor(error),
});

const validateProgress = (progress: CampaignProgress): boolean => {
  try {
    return campaignProgressSchema.safeParse(progress).success;
  } catch {
    return false;
  }
};

/** Create the localStorage adapter around an explicitly injected Storage object. */
export const createLocalStorageProgressRepository = (storage: Storage): ProgressRepository => ({
  load(): ProgressLoadResult {
    let rawValue: string | null;
    try {
      rawValue = storage.getItem(PROGRESS_KEY);
    } catch (error) {
      return storageError(error);
    }

    if (rawValue === null) return { status: 'ok', progress: emptyProgress };

    let candidate: unknown;
    try {
      candidate = JSON.parse(rawValue);
    } catch {
      candidate = undefined;
    }

    const parsed = progressEnvelopeSchema.safeParse(candidate);
    if (parsed.success) return { status: 'ok', progress: parsed.data.data };

    try {
      storage.setItem(PROGRESS_BACKUP_KEY, rawValue);
    } catch (error) {
      return storageError(error);
    }

    return {
      status: 'ok',
      progress: emptyProgress,
      warning: 'invalid-data-backed-up',
    };
  },

  save(progress: CampaignProgress): ProgressSaveResult {
    if (!validateProgress(progress)) return { status: 'error', code: 'invalid-progress' };

    const envelope = { kind: 'progress', version: 1, data: progress } as const;
    let serialized: string;
    try {
      serialized = JSON.stringify(envelope);
    } catch (error) {
      return storageError(error);
    }

    try {
      const currentValue = storage.getItem(PROGRESS_KEY);
      if (currentValue !== null && !isValidProgressEnvelope(currentValue)) {
        storage.setItem(PROGRESS_BACKUP_KEY, currentValue);
      }
      storage.setItem(PROGRESS_KEY, serialized);
      return { status: 'ok' };
    } catch (error) {
      return storageError(error);
    }
  },

  /** U11: removes `tinkerbolt:progress` only; an unreadable value is backed up first (ADR 0011). */
  clear(): ProgressSaveResult {
    try {
      const currentValue = storage.getItem(PROGRESS_KEY);
      if (currentValue === null) return { status: 'ok' };
      if (!isValidProgressEnvelope(currentValue)) {
        storage.setItem(PROGRESS_BACKUP_KEY, currentValue);
      }
      storage.removeItem(PROGRESS_KEY);
      return { status: 'ok' };
    } catch (error) {
      return storageError(error);
    }
  },
});

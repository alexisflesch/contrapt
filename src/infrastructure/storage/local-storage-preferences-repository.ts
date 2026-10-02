import { z } from 'zod';

import type {
  Preferences,
  PreferencesLoadResult,
  PreferencesRepository,
  PreferencesRepositoryErrorCode,
  PreferencesSaveResult,
} from '../../application/preferences/preferences-repository';
import { authorSchema } from '../../domain/level-document';

const PREFERENCES_KEY = 'tinkerbolt:preferences';
const PREFERENCES_BACKUP_KEY = 'tinkerbolt:backup:preferences';

/**
 * ADR 0016 § Pseudo: the pseudonym follows `metadata.author`'s rule. ADR 0011
 * (amendments of 2 Oct. 2026, U8 and U10): level 1's hint, once done, and the
 * declined install invitation are the only other fields — optional, so a
 * version 1 value written before them stays valid.
 */
const preferencesSchema = z.strictObject({
  author: authorSchema.optional(),
  firstLevelHintDone: z.literal(true).optional(),
  installInvitationDeclined: z.literal(true).optional(),
});

const preferencesEnvelopeSchema = z.strictObject({
  kind: z.literal('preferences'),
  version: z.literal(1),
  data: preferencesSchema,
});

const emptyPreferences: Preferences = {};

const parseEnvelope = (rawValue: string): Preferences | null => {
  let candidate: unknown;
  try {
    candidate = JSON.parse(rawValue);
  } catch {
    return null;
  }
  const parsed = preferencesEnvelopeSchema.safeParse(candidate);
  if (!parsed.success) return null;
  const { author, firstLevelHintDone, installInvitationDeclined } = parsed.data.data;
  return {
    ...(author === undefined ? {} : { author }),
    ...(firstLevelHintDone === undefined ? {} : { firstLevelHintDone }),
    ...(installInvitationDeclined === undefined ? {} : { installInvitationDeclined }),
  };
};

const storageError = (
  error: unknown,
): { readonly status: 'error'; readonly code: PreferencesRepositoryErrorCode } => ({
  status: 'error',
  code:
    error instanceof Error && error.name === 'QuotaExceededError'
      ? 'quota-exceeded'
      : 'storage-unavailable',
});

/**
 * ADR 0011: the `localStorage` adapter of `PreferencesRepository`, around an
 * explicitly injected `Storage`. An unreadable value is backed up under
 * `tinkerbolt:backup:preferences` before it is ever replaced.
 */
export const createLocalStoragePreferencesRepository = (
  storage: Storage,
): PreferencesRepository => ({
  load(): PreferencesLoadResult {
    let rawValue: string | null;
    try {
      rawValue = storage.getItem(PREFERENCES_KEY);
    } catch (error) {
      return storageError(error);
    }
    if (rawValue === null) return { status: 'ok', preferences: emptyPreferences };

    const preferences = parseEnvelope(rawValue);
    if (preferences !== null) return { status: 'ok', preferences };

    try {
      storage.setItem(PREFERENCES_BACKUP_KEY, rawValue);
    } catch (error) {
      return storageError(error);
    }
    return { status: 'ok', preferences: emptyPreferences, warning: 'invalid-data-backed-up' };
  },

  save(preferences: Preferences): PreferencesSaveResult {
    const validation = preferencesSchema.safeParse(preferences);
    if (!validation.success) return { status: 'error', code: 'invalid-preferences' };

    const serialized = JSON.stringify({ kind: 'preferences', version: 1, data: validation.data });
    try {
      const currentValue = storage.getItem(PREFERENCES_KEY);
      if (currentValue !== null && parseEnvelope(currentValue) === null) {
        storage.setItem(PREFERENCES_BACKUP_KEY, currentValue);
      }
      storage.setItem(PREFERENCES_KEY, serialized);
      return { status: 'ok' };
    } catch (error) {
      return storageError(error);
    }
  },
});

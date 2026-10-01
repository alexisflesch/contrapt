/** ADR 0016 § Pseudo: the only personal datum kept, the last pseudonym typed. */
export interface Preferences {
  readonly author?: string;
}

export type PreferencesRepositoryErrorCode =
  | 'storage-unavailable'
  | 'quota-exceeded'
  | 'invalid-preferences';

export type PreferencesLoadResult =
  | {
      readonly status: 'ok';
      readonly preferences: Preferences;
      readonly warning?: 'invalid-data-backed-up';
    }
  | { readonly status: 'error'; readonly code: PreferencesRepositoryErrorCode };

export type PreferencesSaveResult =
  | { readonly status: 'ok' }
  | { readonly status: 'error'; readonly code: PreferencesRepositoryErrorCode };

/** Application port for the player's local preferences (ADR 0011, `tinkerbolt:preferences`). */
export interface PreferencesRepository {
  load(): PreferencesLoadResult;
  save(preferences: Preferences): PreferencesSaveResult;
}

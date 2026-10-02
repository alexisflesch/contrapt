import type {
  Preferences,
  PreferencesRepository,
  PreferencesSaveResult,
} from './preferences-repository';

/**
 * U11 (ADR 0016 § Pseudo): keep `author` as the remembered pseudonym, or forget
 * it when `undefined`, while every other preference (U8's hint, U10's declined
 * install, any later field) is kept as it was read. The caller trims and
 * validates the typed value; the repository revalidates it. Nothing is written
 * when the current preferences cannot be read, so they are never overwritten
 * blindly; a storage failure or exception is a result, never thrown.
 */
export const rememberAuthor = (
  repository: PreferencesRepository,
  author: string | undefined,
): PreferencesSaveResult => {
  try {
    const loaded = repository.load();
    if (loaded.status === 'error') return loaded;
    const { author: forgotten, ...others }: Preferences = loaded.preferences;
    void forgotten;
    return repository.save(author === undefined ? others : { ...others, author });
  } catch {
    return { status: 'error', code: 'storage-unavailable' };
  }
};

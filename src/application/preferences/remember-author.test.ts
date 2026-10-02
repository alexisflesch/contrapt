import { describe, expect, it } from 'vitest';

import type { Preferences, PreferencesRepository } from './preferences-repository';
import { rememberAuthor } from './remember-author';

/** An in-memory port: what was saved is what is loaded next. */
const memoryPreferences = (initial: Preferences) => {
  let stored = initial;
  const saved: Preferences[] = [];
  const repository: PreferencesRepository = {
    load: () => ({ status: 'ok', preferences: stored }),
    save: (preferences) => {
      saved.push(preferences);
      stored = preferences;
      return { status: 'ok' };
    },
  };
  return { repository, saved, current: () => stored };
};

const otherFields = { firstLevelHintDone: true, installInvitationDeclined: true } as const;

describe('rememberAuthor (U11)', () => {
  it('modifie le pseudo sans perdre l’aide du niveau 1 ni le refus d’installation', () => {
    const preferences = memoryPreferences({ author: 'Lili', ...otherFields });

    expect(rememberAuthor(preferences.repository, 'Noé')).toEqual({ status: 'ok' });

    expect(preferences.current()).toEqual({ author: 'Noé', ...otherFields });
  });

  it('efface seulement le pseudo et garde les autres préférences', () => {
    const preferences = memoryPreferences({ author: 'Lili', ...otherFields });

    expect(rememberAuthor(preferences.repository, undefined)).toEqual({ status: 'ok' });

    expect(preferences.current()).toEqual(otherFields);
    expect(Object.hasOwn(preferences.current(), 'author')).toBe(false);
  });

  it('retient un premier pseudo dans des préférences vides', () => {
    const preferences = memoryPreferences({});

    expect(rememberAuthor(preferences.repository, 'Noé')).toEqual({ status: 'ok' });
    expect(preferences.current()).toEqual({ author: 'Noé' });
  });

  it('n’écrit rien quand les préférences ne peuvent pas être lues', () => {
    const saved: Preferences[] = [];
    const repository: PreferencesRepository = {
      load: () => ({ status: 'error', code: 'storage-unavailable' }),
      save: (preferences) => {
        saved.push(preferences);
        return { status: 'ok' };
      },
    };

    expect(rememberAuthor(repository, 'Noé')).toEqual({
      status: 'error',
      code: 'storage-unavailable',
    });
    expect(saved).toEqual([]);
  });

  it('rend l’erreur d’écriture du dépôt', () => {
    const repository: PreferencesRepository = {
      load: () => ({ status: 'ok', preferences: {} }),
      save: () => ({ status: 'error', code: 'quota-exceeded' }),
    };

    expect(rememberAuthor(repository, 'Noé')).toEqual({ status: 'error', code: 'quota-exceeded' });
  });

  it('convertit une exception du dépôt en résultat d’erreur', () => {
    const repository: PreferencesRepository = {
      load: () => {
        throw new Error('stockage bloqué');
      },
      save: () => {
        throw new Error('stockage bloqué');
      },
    };

    expect(() => rememberAuthor(repository, 'Noé')).not.toThrow();
    expect(rememberAuthor(repository, 'Noé')).toEqual({
      status: 'error',
      code: 'storage-unavailable',
    });
  });
});

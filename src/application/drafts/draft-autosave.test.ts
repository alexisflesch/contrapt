import { describe, expect, it } from 'vitest';

import { decideDraftAutosave, type DraftAutosaveState } from './draft-autosave';

const emptyState: DraftAutosaveState = { lastAttemptAt: null };

describe('cadence de sauvegarde automatique d’un brouillon', () => {
  it('sauvegarde la première modification sans attendre une seconde', () => {
    expect(decideDraftAutosave(emptyState, 'edit', 10)).toEqual({
      shouldSave: true,
      state: { lastAttemptAt: 10 },
    });
  });

  it('ne sauvegarde pas deux modifications séparées de moins d’une seconde', () => {
    const afterSave = { lastAttemptAt: 500 };

    expect(decideDraftAutosave(afterSave, 'edit', 1_499)).toEqual({
      shouldSave: false,
      state: afterSave,
    });
    expect(decideDraftAutosave(afterSave, 'edit', 1_500)).toEqual({
      shouldSave: true,
      state: { lastAttemptAt: 1_500 },
    });
  });

  it('sauvegarde immédiatement au lancement du test et redémarre la cadence', () => {
    const afterRecentEdit = { lastAttemptAt: 800 };

    expect(decideDraftAutosave(afterRecentEdit, 'test-launch', 900)).toEqual({
      shouldSave: true,
      state: { lastAttemptAt: 900 },
    });
    expect(decideDraftAutosave({ lastAttemptAt: 900 }, 'edit', 1_899)).toMatchObject({
      shouldSave: false,
    });
  });

  it('ne change pas l’état si l’horloge injectée ne fournit pas un temps fini', () => {
    expect(decideDraftAutosave(emptyState, 'edit', Number.NaN)).toEqual({
      shouldSave: false,
      state: emptyState,
    });
  });
});

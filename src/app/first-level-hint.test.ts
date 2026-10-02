import { describe, expect, it } from 'vitest';

import { firstLevelHintStep, offersFirstLevelHint } from './first-level-hint';

describe('offersFirstLevelHint (U8)', () => {
  it('propose l’aide sur le premier niveau de la campagne, jamais résolu ni aidé', () => {
    expect(offersFirstLevelHint({ levelIndex: 0, isLevelSolved: false, isHintDone: false })).toBe(
      true,
    );
  });

  it('ne la propose sur aucun autre niveau', () => {
    expect(offersFirstLevelHint({ levelIndex: 1, isLevelSolved: false, isHintDone: false })).toBe(
      false,
    );
  });

  it('ne la propose plus une fois le niveau résolu', () => {
    expect(offersFirstLevelHint({ levelIndex: 0, isLevelSolved: true, isHintDone: false })).toBe(
      false,
    );
  });

  it('ne la propose plus une fois fermée ou suivie', () => {
    expect(offersFirstLevelHint({ levelIndex: 0, isLevelSolved: false, isHintDone: true })).toBe(
      false,
    );
  });
});

describe('firstLevelHintStep (U8)', () => {
  it('montre d’abord « Lancer » tant que la machine n’a pas tourné', () => {
    expect(firstLevelHintStep({ phase: 'construction', hasLaunched: false, hasActed: false })).toBe(
      'launch',
    );
  });

  it('montre ensuite le tiroir, de retour en construction après un lancer', () => {
    expect(firstLevelHintStep({ phase: 'construction', hasLaunched: true, hasActed: false })).toBe(
      'drawer',
    );
  });

  it('se tait pendant la simulation, la pause et le résultat', () => {
    for (const phase of ['running', 'paused', 'result'] as const) {
      expect(firstLevelHintStep({ phase, hasLaunched: true, hasActed: false })).toBeNull();
    }
  });

  it('disparaît dès la première action sur le plateau', () => {
    expect(firstLevelHintStep({ phase: 'construction', hasLaunched: false, hasActed: true })).toBe(
      null,
    );
    expect(firstLevelHintStep({ phase: 'construction', hasLaunched: true, hasActed: true })).toBe(
      null,
    );
  });
});

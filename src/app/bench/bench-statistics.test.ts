import { describe, expect, it } from 'vitest';

import { benchVerdict, framesPerSecondOverWindow, summarizeDurations } from './bench-statistics';

describe('statistiques du banc de performance', () => {
  it('résume des durées par médiane, 95e centile et pire cas, sans dépendre de l’ordre', () => {
    const durations = Array.from({ length: 100 }, (_, index) => 100 - index);

    expect(summarizeDurations(durations)).toEqual({ count: 100, median: 50.5, p95: 95, max: 100 });
  });

  it('refuse de résumer une série vide', () => {
    expect(() => summarizeDurations([])).toThrow(RangeError);
  });

  it('compte les images affichées dans la dernière fenêtre d’une seconde', () => {
    const timestamps = Array.from({ length: 121 }, (_, index) => index * (1000 / 60));

    expect(framesPerSecondOverWindow(timestamps, 1000)).toBe(60);
    expect(framesPerSecondOverWindow([0], 1000)).toBe(0);
  });

  it('rend un verdict favorable seulement si les images et la physique tiennent le budget', () => {
    expect(benchVerdict({ framesPerSecond: 58, physicsP95Milliseconds: 3 })).toBe('ok');
    expect(benchVerdict({ framesPerSecond: 50, physicsP95Milliseconds: 3 })).toBe('to-review');
    expect(benchVerdict({ framesPerSecond: 60, physicsP95Milliseconds: 9 })).toBe('to-review');
    expect(benchVerdict({ framesPerSecond: null, physicsP95Milliseconds: 3 })).toBe('ok');
  });
});

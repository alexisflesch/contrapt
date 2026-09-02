import { describe, expect, it } from 'vitest';

import { analyzeLifecycle } from './lifecycle-analysis';

describe('analyse mémoire du cycle de vie', () => {
  it('signale une série constante finie sans croissance ni pente', () => {
    expect(analyzeLifecycle([2048, 2048, 2048, 2048], 4)).toEqual({
      sampleCount: 4,
      firstBytes: 2048,
      lastBytes: 2048,
      growthBytes: 0,
      slopeBytesPerCycle: 0,
    });
  });

  it('calcule exactement le delta et la pente d’une croissance linéaire', () => {
    expect(analyzeLifecycle([100, 130, 160, 190], 4)).toEqual({
      sampleCount: 4,
      firstBytes: 100,
      lastBytes: 190,
      growthBytes: 90,
      slopeBytesPerCycle: 30,
    });
  });

  it.each([
    ['une série vide', [], 0],
    ['une longueur différente du nombre de cycles', [100, 110], 3],
    ['une mesure négative', [100, -1, 100], 3],
    ['une mesure non finie', [100, Number.NaN, 100], 3],
    ['une mesure infinie', [100, Number.POSITIVE_INFINITY, 100], 3],
  ])('rejette %s', (_description, measurements, expectedCycles) => {
    expect(() => analyzeLifecycle(measurements, expectedCycles)).toThrow();
  });
});

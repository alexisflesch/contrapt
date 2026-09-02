import { describe, expect, it } from 'vitest';

import { analyzeLifecycle } from './lifecycle-analysis';
import { runScene6LifecycleComparison } from './scene-6-lifecycle';

describe('scène 6 — cycle de vie comparatif', () => {
  it('recrée, réinitialise et détruit la scène sur les deux candidats', async () => {
    const measuredCycles = 32;
    const comparison = await runScene6LifecycleComparison({
      warmupCycles: 8,
      measuredCycles,
      fixedStepsPerCycle: 3,
    });

    expect(comparison.reports).toHaveLength(2);
    expect(comparison.reports.map((report) => report.candidateId)).toEqual([
      'planck-1.5.0',
      'rapier-0.20.0',
    ]);

    for (const report of comparison.reports) {
      expect(report.memoryMeasurements).toHaveLength(measuredCycles);
      expect(report.memoryMeasurements.every((bytes) => Number.isFinite(bytes) && bytes >= 0)).toBe(
        true,
      );
      expect(report.analysis).toEqual(analyzeLifecycle(report.memoryMeasurements, measuredCycles));
      expect(report.analysis.sampleCount).toBe(measuredCycles);
      expect(report.liveObjectCountsAfterDestroy).toHaveLength(measuredCycles);
      expect(report.liveObjectCountsAfterDestroy.every((count) => count === 0)).toBe(true);
    }
  });
});

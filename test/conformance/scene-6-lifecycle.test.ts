import { describe, expect, it } from 'vitest';

import { analyzeLifecycle } from './lifecycle-analysis';
import { runScene6Lifecycle } from './scene-6-lifecycle';

describe('scène 6 — cycle de vie Planck', () => {
  it('recrée et détruit la scène à chaque cycle sans laisser d’objets actifs', () => {
    const measuredCycles = 32;
    const report = runScene6Lifecycle({
      warmupCycles: 8,
      measuredCycles,
      fixedStepsPerCycle: 3,
    });

    expect(report.memoryMeasurements).toHaveLength(measuredCycles);
    expect(
      report.memoryMeasurements.every(
        ({ heapUsedBytes, rssBytes, externalBytes, arrayBuffersBytes }) =>
          [heapUsedBytes, rssBytes, externalBytes, arrayBuffersBytes].every(
            (bytes) => Number.isFinite(bytes) && bytes >= 0,
          ),
      ),
    ).toBe(true);
    expect(report.analysis).toEqual(
      analyzeLifecycle(
        report.memoryMeasurements.map(({ rssBytes }) => rssBytes),
        measuredCycles,
      ),
    );
    expect(report.analysis.sampleCount).toBe(measuredCycles);
    expect(report.liveObjectCountsAfterDestroy).toHaveLength(measuredCycles);
    expect(report.liveObjectCountsAfterDestroy.every((count) => count === 0)).toBe(true);
  });
});

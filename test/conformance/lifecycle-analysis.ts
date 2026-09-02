export interface LifecycleAnalysis {
  readonly sampleCount: number;
  readonly firstBytes: number;
  readonly lastBytes: number;
  readonly growthBytes: number;
  readonly slopeBytesPerCycle: number;
}

const assertExpectedCycles = (expectedCycles: number): void => {
  if (!Number.isSafeInteger(expectedCycles) || expectedCycles <= 0) {
    throw new RangeError('Le nombre de cycles attendu doit être un entier strictement positif.');
  }
};

const assertMeasurements = (measurements: readonly number[], expectedCycles: number): void => {
  if (measurements.length === 0) {
    throw new RangeError('Au moins une mesure mémoire est requise.');
  }
  if (measurements.length !== expectedCycles) {
    throw new RangeError('Le nombre de mesures doit correspondre au nombre de cycles attendu.');
  }
  if (measurements.some((measurement) => !Number.isFinite(measurement) || measurement < 0)) {
    throw new RangeError('Les mesures mémoire doivent être finies et positives ou nulles.');
  }
};

const calculateSlope = (measurements: readonly number[]): number => {
  const count = measurements.length;
  if (count === 1) return 0;
  const meanCycle = (count - 1) / 2;
  const meanBytes = measurements.reduce((sum, measurement) => sum + measurement, 0) / count;
  let covariance = 0;
  let cycleVariance = 0;

  measurements.forEach((measurement, cycle) => {
    const cycleDelta = cycle - meanCycle;
    covariance += cycleDelta * (measurement - meanBytes);
    cycleVariance += cycleDelta * cycleDelta;
  });

  const slope = covariance / cycleVariance;
  return slope === 0 ? 0 : slope;
};

export const analyzeLifecycle = (
  measurements: readonly number[],
  expectedCycles: number,
): LifecycleAnalysis => {
  assertExpectedCycles(expectedCycles);
  assertMeasurements(measurements, expectedCycles);

  const firstBytes = measurements[0];
  const lastBytes = measurements[measurements.length - 1];
  if (firstBytes === undefined || lastBytes === undefined) {
    throw new Error('Les mesures validées doivent contenir une première et une dernière valeur.');
  }

  const growthBytes = lastBytes - firstBytes;
  return {
    sampleCount: measurements.length,
    firstBytes,
    lastBytes,
    growthBytes: growthBytes === 0 ? 0 : growthBytes,
    slopeBytesPerCycle: calculateSlope(measurements),
  };
};

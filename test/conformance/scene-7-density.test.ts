import { strict as assert } from 'node:assert';
import { describe, expect, it } from 'vitest';

import { createScene7DensityHarness } from './scene-7-density';

const EXPECTED_OBJECT_ORDER = [
  'ball-01',
  'basket-01',
  ...Array.from({ length: 16 }, (_, index) => `beam-${String(index + 1).padStart(2, '0')}`),
  ...Array.from({ length: 6 }, (_, index) => `seesaw-${String(index + 1).padStart(2, '0')}`),
];

const EXPECTED_SNAPSHOT_PLACEMENT_IDS = [
  'ball-01',
  'basket-01',
  ...Array.from({ length: 16 }, (_, index) => `beam-${String(index + 1).padStart(2, '0')}`),
  ...Array.from({ length: 6 }, (_, index) => {
    const seesawId = `seesaw-${String(index + 1).padStart(2, '0')}`;
    return [`${seesawId}:base`, `${seesawId}:board`];
  }).flat(),
];

const EXPECTED_PARAMETERS = {
  fixedTimeStep: 1 / 60,
  warmupSteps: 120,
  measuredSteps: 600,
  repetitions: 5,
};

const EXPECTED_SAMPLING_POLICY = {
  warmupSteps: 120,
  measuredSteps: 600,
  repetitions: 5,
  durationScope: 'measured-steps-only',
  observationPoint: 'after-measured-steps-before-destroy',
} as const;

const EXPECTED_OBSERVATION_TOLERANCE = 1e-9;

const expectFiniteVector = (vector: { readonly x: number; readonly y: number }): void => {
  expect(Number.isFinite(vector.x)).toBe(true);
  expect(Number.isFinite(vector.y)).toBe(true);
};

describe('scene 7 density conformance contract', () => {
  it('uses the deterministic dense fixture at the provisional maximum budget', () => {
    const harness = createScene7DensityHarness();

    expect(harness.fixture.objectOrder).toEqual(EXPECTED_OBJECT_ORDER);
    expect(harness.fixture.bodyBreakdown).toEqual({
      ball: 1,
      basket: 1,
      beam: 16,
      seesawBase: 6,
      seesawBoard: 6,
    });
    expect(harness.fixture.physicalBodyCount).toBe(30);
    expect(harness.fixture.jointCount).toBe(6);
    expect(harness.fixture.usesClock).toBe(false);
    expect(harness.fixture.usesRandom).toBe(false);
  });

  it('keeps the fixed-step and measurement parameters explicit', () => {
    const harness = createScene7DensityHarness();

    expect(harness.parameters).toEqual(EXPECTED_PARAMETERS);
    expect(harness.samplingPolicy).toEqual(EXPECTED_SAMPLING_POLICY);
  });

  it('observes the physical counts before and after destruction for every repetition', () => {
    const harness = createScene7DensityHarness();
    const observations = harness.measurement.observations;

    expect(observations).toHaveLength(EXPECTED_PARAMETERS.repetitions);
    assert.ok(observations);
    for (const observation of observations) {
      expect(observation.countsBeforeDestroy).toEqual({
        bodies: 30,
        colliders: 30,
        joints: 6,
      });
      expect(observation.countsAfterDestroy).toEqual({
        bodies: 0,
        colliders: 0,
        joints: 0,
      });
    }
  });

  it('repeats a finite position and velocity snapshot within tolerance', () => {
    const harness = createScene7DensityHarness();
    const measurement = harness.measurement;
    const observations = measurement.observations;

    expect(measurement.durationsMs).toHaveLength(EXPECTED_PARAMETERS.repetitions);
    expect(measurement.durationsMs.every(Number.isFinite)).toBe(true);
    expect(Number.isFinite(measurement.percentiles.p50)).toBe(true);
    expect(Number.isFinite(measurement.percentiles.p95)).toBe(true);
    expect(Number.isFinite(measurement.percentiles.p99)).toBe(true);
    expect(observations).toBeDefined();
    assert.ok(observations);

    const referenceObservation = observations[0];
    expect(referenceObservation).toBeDefined();
    if (referenceObservation === undefined) return;
    expect(referenceObservation.snapshot.bodies).toHaveLength(30);

    for (const observation of observations) {
      expect(observation.snapshot.bodies.map(({ placementId }) => placementId)).toEqual(
        EXPECTED_SNAPSHOT_PLACEMENT_IDS,
      );
    }

    for (const body of referenceObservation.snapshot.bodies) {
      expect(body.placementId).not.toHaveLength(0);
      expectFiniteVector(body.position);
      expectFiniteVector(body.linearVelocity);
    }

    for (const observation of observations.slice(1)) {
      expect(observation.snapshot.bodies).toHaveLength(referenceObservation.snapshot.bodies.length);
      for (const [index, body] of observation.snapshot.bodies.entries()) {
        const referenceBody = referenceObservation.snapshot.bodies[index];
        expect(referenceBody).toBeDefined();
        if (referenceBody === undefined) continue;
        expect(body.placementId).toBe(referenceBody.placementId);
        expect(Math.abs(body.position.x - referenceBody.position.x)).toBeLessThanOrEqual(
          EXPECTED_OBSERVATION_TOLERANCE,
        );
        expect(Math.abs(body.position.y - referenceBody.position.y)).toBeLessThanOrEqual(
          EXPECTED_OBSERVATION_TOLERANCE,
        );
        expect(
          Math.abs(body.linearVelocity.x - referenceBody.linearVelocity.x),
        ).toBeLessThanOrEqual(EXPECTED_OBSERVATION_TOLERANCE);
        expect(
          Math.abs(body.linearVelocity.y - referenceBody.linearVelocity.y),
        ).toBeLessThanOrEqual(EXPECTED_OBSERVATION_TOLERANCE);
      }
    }
  });
});

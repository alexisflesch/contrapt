import { describe, expect, it } from 'vitest';

import { malformedTraceCases, stableTrace, traceWithTinyDrift } from '../fixtures/physics-traces';
import {
  analyzeRest,
  analyzeReproducibility,
  calculateDurationPercentiles,
  createPhysicsConformanceReport,
  validatePhysicsTrace,
} from './physics-analysis';

describe('protocole de conformité physique', () => {
  it('accepte une trace finie, ordonnée et cohérente indépendante du candidat', () => {
    expect(validatePhysicsTrace(stableTrace)).toEqual([]);
    expect(validatePhysicsTrace(traceWithTinyDrift)).toEqual([]);
  });

  it.each(malformedTraceCases)('détecte $name', ({ trace, issueCode }) => {
    expect(validatePhysicsTrace(trace)).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: issueCode })]),
    );
  });

  it('valide un maintien au repos sur le nombre de pas fixes demandé', () => {
    expect(
      analyzeRest(stableTrace, {
        placementId: 'ball-1',
        maximumLinearSpeed: 0.01,
        maximumAngularSpeed: 0.01,
        minimumConsecutiveFixedSteps: 3,
      }),
    ).toEqual({
      passed: true,
      placementId: 'ball-1',
      restingFromFixedStep: 2,
      observedConsecutiveFixedSteps: 3,
      requiredConsecutiveFixedSteps: 3,
    });
  });

  it('refuse un repos trop court ou un corps absent', () => {
    expect(
      analyzeRest(stableTrace, {
        placementId: 'ball-1',
        maximumLinearSpeed: 0.001,
        maximumAngularSpeed: 0.01,
        minimumConsecutiveFixedSteps: 2,
      }),
    ).toMatchObject({ passed: false, observedConsecutiveFixedSteps: 0 });
    expect(
      analyzeRest(stableTrace, {
        placementId: 'missing',
        maximumLinearSpeed: 1,
        maximumAngularSpeed: 1,
        minimumConsecutiveFixedSteps: 1,
      }),
    ).toMatchObject({ passed: false, restingFromFixedStep: null });
  });

  it('compare deux exécutions avec une tolérance numérique injectée', () => {
    const tolerant = analyzeReproducibility(stableTrace, traceWithTinyDrift, 0.000_01);
    expect(tolerant).toMatchObject({ passed: true, issues: [] });
    expect(tolerant.maximumAbsoluteDelta).toBeCloseTo(0.000_001);

    const strict = analyzeReproducibility(stableTrace, traceWithTinyDrift, 0);
    expect(strict.passed).toBe(false);
    expect(strict.maximumAbsoluteDelta).toBeCloseTo(0.000_001);
    expect(strict.issues).toContain('numeric-tolerance-exceeded');
  });

  it('détecte une divergence structurelle ou événementielle entre deux exécutions', () => {
    const changedEvents = {
      ...traceWithTinyDrift,
      events: traceWithTinyDrift.events.slice(0, 1),
    };
    const changedFrames = {
      ...traceWithTinyDrift,
      frames: traceWithTinyDrift.frames.slice(0, -1),
    };

    expect(analyzeReproducibility(stableTrace, changedEvents, 1).issues).toContain(
      'event-sequence-mismatch',
    );
    expect(analyzeReproducibility(stableTrace, changedFrames, 1).issues).toContain(
      'frame-sequence-mismatch',
    );
  });

  it('calcule p50, p95 et p99 par rang le plus proche sans muter les mesures', () => {
    const durations = [100, 1, 50, 10, 20];
    const snapshot = [...durations];

    expect(calculateDurationPercentiles(durations)).toEqual({
      sampleCount: 5,
      p50Milliseconds: 20,
      p95Milliseconds: 100,
      p99Milliseconds: 100,
    });
    expect(durations).toEqual(snapshot);
  });

  it('refuse les séries de durée vides, négatives ou non finies', () => {
    expect(() => calculateDurationPercentiles([])).toThrow('au moins une mesure');
    expect(() => calculateDurationPercentiles([1, -1])).toThrow('finies et positives');
    expect(() => calculateDurationPercentiles([1, Number.POSITIVE_INFINITY])).toThrow(
      'finies et positives',
    );
  });

  it('agrège des analyses sérialisables dans un rapport candidat/scénario', () => {
    const report = createPhysicsConformanceReport({
      trace: stableTrace,
      rest: {
        placementId: 'ball-1',
        maximumLinearSpeed: 0.01,
        maximumAngularSpeed: 0.01,
        minimumConsecutiveFixedSteps: 3,
      },
      reproducibilityBaseline: stableTrace,
      reproducibilityTolerance: 0,
      durationMeasurementsMilliseconds: [3, 1, 2],
    });

    expect(report).toMatchObject({
      protocolVersion: 1,
      candidateId: 'candidate-a',
      scenarioId: 'ball-drop',
      runId: 'run-1',
      passed: true,
      traceIssues: [],
      rest: { passed: true },
      reproducibility: { passed: true },
      durations: {
        sampleCount: 3,
        p50Milliseconds: 2,
        p95Milliseconds: 3,
        p99Milliseconds: 3,
      },
    });
    expect(JSON.parse(JSON.stringify(report))).toEqual(report);
  });
});

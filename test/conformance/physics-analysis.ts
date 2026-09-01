import type {
  DurationPercentiles,
  PhysicsConformanceReport,
  PhysicsTrace,
  PhysicsTraceBodyState,
  PhysicsTraceIssue,
  PhysicsTraceIssueCode,
  PhysicsTraceSensorEvent,
  ReproducibilityAnalysis,
  ReproducibilityIssue,
  RestAnalysis,
  RestCriteria,
} from './physics-protocol';

const isNonNegativeSafeInteger = (value: number): boolean =>
  Number.isSafeInteger(value) && value >= 0;

const bodyNumbers = (body: PhysicsTraceBodyState): readonly number[] => [
  body.position.x,
  body.position.y,
  body.rotation,
  body.linearVelocity.x,
  body.linearVelocity.y,
  body.angularVelocity,
];

const addIssue = (issues: PhysicsTraceIssue[], code: PhysicsTraceIssueCode, path: string): void => {
  issues.push({ code, path });
};

const validateMetadata = (trace: PhysicsTrace, issues: PhysicsTraceIssue[]): void => {
  for (const [name, value] of [
    ['candidateId', trace.candidateId],
    ['scenarioId', trace.scenarioId],
    ['runId', trace.runId],
  ] as const) {
    if (value.length === 0) addIssue(issues, 'invalid-metadata', name);
  }

  if (!Number.isFinite(trace.fixedStepSeconds) || trace.fixedStepSeconds <= 0) {
    addIssue(issues, 'non-finite-number', 'fixedStepSeconds');
  }
};

const validateFrames = (trace: PhysicsTrace, issues: PhysicsTraceIssue[]): void => {
  trace.frames.forEach((frame, frameIndex) => {
    if (!isNonNegativeSafeInteger(frame.fixedStep)) {
      addIssue(issues, 'invalid-fixed-step', `frames[${String(frameIndex)}].fixedStep`);
    }
    if (frame.fixedStep !== frameIndex) {
      addIssue(issues, 'non-contiguous-fixed-step', `frames[${String(frameIndex)}].fixedStep`);
    }

    let previousPlacementId: string | undefined;
    frame.bodies.forEach((body, bodyIndex) => {
      const bodyPath = `frames[${String(frameIndex)}].bodies[${String(bodyIndex)}]`;
      if (body.placementId.length === 0) addIssue(issues, 'invalid-metadata', bodyPath);

      if (previousPlacementId === body.placementId) {
        addIssue(issues, 'duplicate-body-id', `${bodyPath}.placementId`);
      } else if (previousPlacementId !== undefined && previousPlacementId > body.placementId) {
        addIssue(issues, 'unstable-body-order', `${bodyPath}.placementId`);
      }
      previousPlacementId = body.placementId;

      if (bodyNumbers(body).some((value) => !Number.isFinite(value))) {
        addIssue(issues, 'non-finite-number', bodyPath);
      }
    });
  });
};

const eventContactKey = (event: PhysicsTraceSensorEvent): string =>
  `${event.placementId}\u0000${event.targetId}`;

const validateEvents = (trace: PhysicsTrace, issues: PhysicsTraceIssue[]): void => {
  let previousStep = -1;
  let previousOrder = -1;
  const activeContacts = new Set<string>();

  trace.events.forEach((event, eventIndex) => {
    const path = `events[${String(eventIndex)}]`;
    if (!isNonNegativeSafeInteger(event.fixedStep) || !isNonNegativeSafeInteger(event.order)) {
      addIssue(issues, 'invalid-fixed-step', path);
    }
    if (event.placementId.length === 0 || event.targetId.length === 0) {
      addIssue(issues, 'invalid-metadata', path);
    }
    if (event.fixedStep >= trace.frames.length) {
      addIssue(issues, 'event-outside-trace', `${path}.fixedStep`);
    }

    const expectedOrder = event.fixedStep === previousStep ? previousOrder + 1 : 0;
    if (event.fixedStep < previousStep || event.order !== expectedOrder) {
      addIssue(issues, 'unstable-event-order', path);
    }
    previousStep = event.fixedStep;
    previousOrder = event.order;

    const contactKey = eventContactKey(event);
    switch (event.type) {
      case 'object-entered-sensor':
        if (activeContacts.has(contactKey)) {
          addIssue(issues, 'duplicate-sensor-entry', path);
        } else {
          activeContacts.add(contactKey);
        }
        break;
      case 'object-left-sensor':
        if (!activeContacts.delete(contactKey)) {
          addIssue(issues, 'sensor-left-without-entry', path);
        }
        break;
    }
  });
};

export const validatePhysicsTrace = (trace: PhysicsTrace): readonly PhysicsTraceIssue[] => {
  const issues: PhysicsTraceIssue[] = [];
  validateMetadata(trace, issues);
  validateFrames(trace, issues);
  validateEvents(trace, issues);
  return issues;
};

const assertRestCriteria = (criteria: RestCriteria): void => {
  if (
    criteria.placementId.length === 0 ||
    !Number.isFinite(criteria.maximumLinearSpeed) ||
    criteria.maximumLinearSpeed < 0 ||
    !Number.isFinite(criteria.maximumAngularSpeed) ||
    criteria.maximumAngularSpeed < 0 ||
    !Number.isSafeInteger(criteria.minimumConsecutiveFixedSteps) ||
    criteria.minimumConsecutiveFixedSteps <= 0
  ) {
    throw new RangeError('Les critères de repos doivent être finis, positifs et non vides.');
  }
};

export const analyzeRest = (trace: PhysicsTrace, criteria: RestCriteria): RestAnalysis => {
  assertRestCriteria(criteria);
  let observedConsecutiveFixedSteps = 0;
  let restingFromFixedStep: number | null = null;

  for (const frame of trace.frames) {
    const body = frame.bodies.find(({ placementId }) => placementId === criteria.placementId);
    const linearSpeed =
      body === undefined
        ? Number.POSITIVE_INFINITY
        : Math.hypot(body.linearVelocity.x, body.linearVelocity.y);
    const atRest =
      body !== undefined &&
      linearSpeed <= criteria.maximumLinearSpeed &&
      Math.abs(body.angularVelocity) <= criteria.maximumAngularSpeed;

    if (atRest) {
      if (observedConsecutiveFixedSteps === 0) restingFromFixedStep = frame.fixedStep;
      observedConsecutiveFixedSteps += 1;
    } else {
      observedConsecutiveFixedSteps = 0;
      restingFromFixedStep = null;
    }
  }

  return {
    passed: observedConsecutiveFixedSteps >= criteria.minimumConsecutiveFixedSteps,
    placementId: criteria.placementId,
    restingFromFixedStep,
    observedConsecutiveFixedSteps,
    requiredConsecutiveFixedSteps: criteria.minimumConsecutiveFixedSteps,
  };
};

const addReproducibilityIssue = (
  issues: ReproducibilityIssue[],
  issue: ReproducibilityIssue,
): void => {
  if (!issues.includes(issue)) issues.push(issue);
};

const eventsMatch = (
  reference: readonly PhysicsTraceSensorEvent[],
  candidate: readonly PhysicsTraceSensorEvent[],
): boolean =>
  reference.length === candidate.length &&
  reference.every((event, index) => {
    const other = candidate[index];
    return (
      other !== undefined &&
      event.type === other.type &&
      event.placementId === other.placementId &&
      event.targetId === other.targetId &&
      event.fixedStep === other.fixedStep &&
      event.order === other.order
    );
  });

export const analyzeReproducibility = (
  reference: PhysicsTrace,
  candidate: PhysicsTrace,
  maximumAllowedDelta: number,
): ReproducibilityAnalysis => {
  if (!Number.isFinite(maximumAllowedDelta) || maximumAllowedDelta < 0) {
    throw new RangeError('La tolérance de reproductibilité doit être finie et positive ou nulle.');
  }

  const issues: ReproducibilityIssue[] = [];
  let maximumAbsoluteDelta: number | null = null;

  if (reference.scenarioId !== candidate.scenarioId) {
    addReproducibilityIssue(issues, 'scenario-mismatch');
  }
  if (reference.fixedStepSeconds !== candidate.fixedStepSeconds) {
    addReproducibilityIssue(issues, 'fixed-step-duration-mismatch');
  }
  if (reference.frames.length !== candidate.frames.length) {
    addReproducibilityIssue(issues, 'frame-sequence-mismatch');
  }

  const comparedFrameCount = Math.min(reference.frames.length, candidate.frames.length);
  for (let frameIndex = 0; frameIndex < comparedFrameCount; frameIndex += 1) {
    const referenceFrame = reference.frames[frameIndex];
    const candidateFrame = candidate.frames[frameIndex];
    if (referenceFrame === undefined || candidateFrame === undefined) continue;

    if (referenceFrame.fixedStep !== candidateFrame.fixedStep) {
      addReproducibilityIssue(issues, 'frame-sequence-mismatch');
    }
    if (referenceFrame.bodies.length !== candidateFrame.bodies.length) {
      addReproducibilityIssue(issues, 'body-sequence-mismatch');
    }

    const comparedBodyCount = Math.min(referenceFrame.bodies.length, candidateFrame.bodies.length);
    for (let bodyIndex = 0; bodyIndex < comparedBodyCount; bodyIndex += 1) {
      const referenceBody = referenceFrame.bodies[bodyIndex];
      const candidateBody = candidateFrame.bodies[bodyIndex];
      if (referenceBody === undefined || candidateBody === undefined) continue;

      if (referenceBody.placementId !== candidateBody.placementId) {
        addReproducibilityIssue(issues, 'body-sequence-mismatch');
        continue;
      }

      const referenceNumbers = bodyNumbers(referenceBody);
      const candidateNumbers = bodyNumbers(candidateBody);
      for (let valueIndex = 0; valueIndex < referenceNumbers.length; valueIndex += 1) {
        const referenceValue = referenceNumbers[valueIndex];
        const candidateValue = candidateNumbers[valueIndex];
        if (referenceValue === undefined || candidateValue === undefined) continue;
        const delta = Math.abs(referenceValue - candidateValue);
        maximumAbsoluteDelta = Math.max(maximumAbsoluteDelta ?? 0, delta);
      }
    }
  }

  if (!eventsMatch(reference.events, candidate.events)) {
    addReproducibilityIssue(issues, 'event-sequence-mismatch');
  }
  if (maximumAbsoluteDelta !== null && maximumAbsoluteDelta > maximumAllowedDelta) {
    addReproducibilityIssue(issues, 'numeric-tolerance-exceeded');
  }

  return { passed: issues.length === 0, maximumAbsoluteDelta, issues };
};

const nearestRank = (sortedValues: readonly number[], percentile: number): number => {
  const index = Math.ceil(percentile * sortedValues.length) - 1;
  const value = sortedValues[index];
  if (value === undefined) throw new Error('Le percentile calculé ne correspond à aucune mesure.');
  return value;
};

export const calculateDurationPercentiles = (
  measurementsMilliseconds: readonly number[],
): DurationPercentiles => {
  if (measurementsMilliseconds.length === 0) {
    throw new RangeError('Les percentiles exigent au moins une mesure.');
  }
  if (
    measurementsMilliseconds.some((measurement) => !Number.isFinite(measurement) || measurement < 0)
  ) {
    throw new RangeError('Les durées doivent être finies et positives ou nulles.');
  }

  const sortedMeasurements = [...measurementsMilliseconds].sort((left, right) => left - right);
  return {
    sampleCount: sortedMeasurements.length,
    p50Milliseconds: nearestRank(sortedMeasurements, 0.5),
    p95Milliseconds: nearestRank(sortedMeasurements, 0.95),
    p99Milliseconds: nearestRank(sortedMeasurements, 0.99),
  };
};

interface PhysicsConformanceReportInput {
  readonly trace: PhysicsTrace;
  readonly rest?: RestCriteria;
  readonly reproducibilityBaseline?: PhysicsTrace;
  readonly reproducibilityTolerance?: number;
  readonly durationMeasurementsMilliseconds?: readonly number[];
}

export const createPhysicsConformanceReport = (
  input: PhysicsConformanceReportInput,
): PhysicsConformanceReport => {
  const traceIssues = validatePhysicsTrace(input.trace);
  const rest = input.rest === undefined ? null : analyzeRest(input.trace, input.rest);
  const reproducibility =
    input.reproducibilityBaseline === undefined
      ? null
      : analyzeReproducibility(
          input.reproducibilityBaseline,
          input.trace,
          input.reproducibilityTolerance ?? 0,
        );
  const durations =
    input.durationMeasurementsMilliseconds === undefined
      ? null
      : calculateDurationPercentiles(input.durationMeasurementsMilliseconds);

  return {
    protocolVersion: 1,
    candidateId: input.trace.candidateId,
    scenarioId: input.trace.scenarioId,
    runId: input.trace.runId,
    passed: traceIssues.length === 0 && (rest?.passed ?? true) && (reproducibility?.passed ?? true),
    traceIssues,
    rest,
    reproducibility,
    durations,
  };
};

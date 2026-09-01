/**
 * Candidate-neutral, JSON-like protocol emitted by conformance adapters.
 * Coordinates use world units, angles use radians and velocities use units per second.
 */
export interface PhysicsTraceBodyState {
  readonly placementId: string;
  readonly position: { readonly x: number; readonly y: number };
  readonly rotation: number;
  readonly linearVelocity: { readonly x: number; readonly y: number };
  readonly angularVelocity: number;
}

export interface PhysicsTraceFrame {
  readonly fixedStep: number;
  /** Ordered lexicographically by placementId before crossing the adapter boundary. */
  readonly bodies: readonly PhysicsTraceBodyState[];
}

export interface PhysicsTraceSensorEvent {
  readonly type: 'object-entered-sensor' | 'object-left-sensor';
  readonly placementId: string;
  readonly targetId: string;
  readonly fixedStep: number;
  /** Contiguous total order, starting at zero for every fixed step. */
  readonly order: number;
}

export interface PhysicsTrace {
  readonly protocolVersion: 1;
  readonly candidateId: string;
  readonly scenarioId: string;
  readonly runId: string;
  readonly fixedStepSeconds: number;
  readonly frames: readonly PhysicsTraceFrame[];
  readonly events: readonly PhysicsTraceSensorEvent[];
}

export type PhysicsTraceIssueCode =
  | 'invalid-metadata'
  | 'non-finite-number'
  | 'invalid-fixed-step'
  | 'non-contiguous-fixed-step'
  | 'duplicate-body-id'
  | 'unstable-body-order'
  | 'unstable-event-order'
  | 'event-outside-trace'
  | 'duplicate-sensor-entry'
  | 'sensor-left-without-entry';

export interface PhysicsTraceIssue {
  readonly code: PhysicsTraceIssueCode;
  readonly path: string;
}

export interface RestCriteria {
  readonly placementId: string;
  readonly maximumLinearSpeed: number;
  readonly maximumAngularSpeed: number;
  readonly minimumConsecutiveFixedSteps: number;
}

export interface RestAnalysis {
  readonly passed: boolean;
  readonly placementId: string;
  readonly restingFromFixedStep: number | null;
  readonly observedConsecutiveFixedSteps: number;
  readonly requiredConsecutiveFixedSteps: number;
}

export type ReproducibilityIssue =
  | 'scenario-mismatch'
  | 'fixed-step-duration-mismatch'
  | 'frame-sequence-mismatch'
  | 'body-sequence-mismatch'
  | 'event-sequence-mismatch'
  | 'numeric-tolerance-exceeded';

export interface ReproducibilityAnalysis {
  readonly passed: boolean;
  readonly maximumAbsoluteDelta: number | null;
  readonly issues: readonly ReproducibilityIssue[];
}

export interface DurationPercentiles {
  readonly sampleCount: number;
  readonly p50Milliseconds: number;
  readonly p95Milliseconds: number;
  readonly p99Milliseconds: number;
}

export interface PhysicsConformanceReport {
  readonly protocolVersion: 1;
  readonly candidateId: string;
  readonly scenarioId: string;
  readonly runId: string;
  readonly passed: boolean;
  readonly traceIssues: readonly PhysicsTraceIssue[];
  readonly rest: RestAnalysis | null;
  readonly reproducibility: ReproducibilityAnalysis | null;
  readonly durations: DurationPercentiles | null;
}

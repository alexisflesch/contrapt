import type { BasketGoalEvaluation } from './basket-goal-evaluator';

interface WorldPoint {
  readonly x: number;
  readonly y: number;
}

/** The level's scene rectangle, in world units, `y` growing downwards (ADR 0007). */
interface SceneBounds {
  readonly min: WorldPoint;
  readonly max: WorldPoint;
}

export interface AttemptFailureRule {
  /** Placement identifier of the ball the goal targets; other bodies may leave freely. */
  readonly ballId: string;
  readonly scene: SceneBounds;
  /** How far past the scene (left, right, bottom) the ball centre may still travel before the attempt is lost. */
  readonly outOfSceneMarginInWorldUnits: number;
  /**
   * Budget of the attempt, counted in fixed steps. Seconds never reach this
   * layer: the caller owns the fixed step duration and converts.
   */
  readonly timeoutInFixedSteps: number;
}

/**
 * The position of one body after a given fixed step. Unlike a sensor contact,
 * a step derives exactly one such fact per tracked body, but the ordering
 * fields are kept so a batch is read in the same engine-independent
 * `(fixedStep, order)` order as `SensorContactFact`.
 */
export interface BallPositionFact {
  /** Identifier of the level placement, never a physics handle. */
  readonly placementId: string;
  readonly position: WorldPoint;
  readonly fixedStep: number;
  /** Total order within a fixed step, assigned by the simulation adapter. */
  readonly order: number;
}

export type AttemptFailureReason = 'out-of-scene' | 'timeout';

/**
 * A discriminated union rather than three independent fields: a failed
 * evaluation always names its cause and the step that produced it, and a
 * pending one never does, so no caller has to handle a state that cannot
 * happen.
 */
export type AttemptFailureEvaluation =
  | { readonly status: 'pending'; readonly reason: null; readonly failedAtFixedStep: null }
  | {
      readonly status: 'failed';
      readonly reason: AttemptFailureReason;
      readonly failedAtFixedStep: number;
    };

/** What an attempt ended as, once one of the two evaluators has concluded. */
export type AttemptOutcome =
  | { readonly outcome: 'won' }
  | { readonly outcome: 'lost'; readonly reason: AttemptFailureReason };

const initialEvaluation = (): AttemptFailureEvaluation => ({
  status: 'pending',
  reason: null,
  failedAtFixedStep: null,
});

const assertNonNegativeSafeInteger = (value: number, label: string): void => {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`${label} doit être un entier sûr positif ou nul.`);
  }
};

const assertPositiveSafeInteger = (value: number, label: string): void => {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new RangeError(`${label} doit être un entier sûr strictement positif.`);
  }
};

const assertNonNegativeFinite = (value: number, label: string): void => {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${label} doit être un nombre fini positif ou nul.`);
  }
};

const assertFinitePoint = (point: WorldPoint, label: string): void => {
  if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) {
    throw new RangeError(`${label} doit avoir des coordonnées finies.`);
  }
};

const fail = (
  reason: AttemptFailureReason,
  failedAtFixedStep: number,
): AttemptFailureEvaluation => ({ status: 'failed', reason, failedAtFixedStep });

/**
 * The scene rectangle, widened by the tolerated margin on the left, right and
 * bottom. A ball exactly on that widened border is still in play: only
 * crossing it loses the attempt. The top is open (V2b): a ball thrown above
 * the scene stays in play and gravity brings it back, or the time budget ends
 * the attempt. `y` grows downwards (ADR 0007), so the top is `scene.min.y`.
 */
const isOutOfScene = (position: WorldPoint, rule: AttemptFailureRule): boolean => {
  assertNonNegativeFinite(rule.outOfSceneMarginInWorldUnits, 'La marge hors scène');
  assertFinitePoint(rule.scene.min, 'Le coin minimal de la scène');
  assertFinitePoint(rule.scene.max, 'Le coin maximal de la scène');

  const margin = rule.outOfSceneMarginInWorldUnits;
  return (
    position.x < rule.scene.min.x - margin ||
    position.x > rule.scene.max.x + margin ||
    position.y > rule.scene.max.y + margin
  );
};

export const createAttemptFailureEvaluation = (): AttemptFailureEvaluation => initialEvaluation();

/**
 * Applies one already ordered position fact without mutating its inputs. The
 * first cause is kept: an attempt already lost stays lost with the reason that
 * ended it, so a later fact can neither rescue nor relabel it.
 */
export const applyAttemptFailureFact = (
  evaluation: AttemptFailureEvaluation,
  rule: AttemptFailureRule,
  fact: BallPositionFact,
): AttemptFailureEvaluation => {
  assertNonNegativeSafeInteger(fact.fixedStep, 'Le numéro de pas fixe');
  assertNonNegativeSafeInteger(fact.order, 'L’ordre du fait');
  assertFinitePoint(fact.position, 'La position de la balle');

  if (evaluation.status === 'failed') return evaluation;
  if (fact.placementId !== rule.ballId) return evaluation;
  if (!isOutOfScene(fact.position, rule)) return evaluation;

  return fail('out-of-scene', fact.fixedStep);
};

/** Applies a batch in its engine-independent `(fixedStep, order)` order. */
export const applyAttemptFailureFacts = (
  evaluation: AttemptFailureEvaluation,
  rule: AttemptFailureRule,
  facts: readonly BallPositionFact[],
): AttemptFailureEvaluation => {
  const orderedFacts = [...facts].sort(
    (left, right) => left.fixedStep - right.fixedStep || left.order - right.order,
  );

  for (let index = 1; index < orderedFacts.length; index += 1) {
    const previous = orderedFacts[index - 1];
    const current = orderedFacts[index];
    if (
      previous !== undefined &&
      current !== undefined &&
      previous.fixedStep === current.fixedStep &&
      previous.order === current.order
    ) {
      throw new Error(
        `Les faits du pas ${String(current.fixedStep)} doivent avoir un ordre stable unique.`,
      );
    }
  }

  return orderedFacts.reduce(
    (currentEvaluation, fact) => applyAttemptFailureFact(currentEvaluation, rule, fact),
    evaluation,
  );
};

/**
 * Evaluates the elapsed budget; wall-clock time never enters the rule. The
 * attempt is lost on the first step whose number reaches the limit, so a
 * budget of `n` steps grants exactly `n` simulated steps of play.
 *
 * Applied after the step's position facts, so a ball that leaves the scene on
 * the very step the budget expires is reported as `out-of-scene`: that reason
 * explains what happened, where `timeout` only states that the budget ran out.
 */
export const advanceAttemptFailureEvaluation = (
  evaluation: AttemptFailureEvaluation,
  rule: AttemptFailureRule,
  currentFixedStep: number,
): AttemptFailureEvaluation => {
  assertPositiveSafeInteger(rule.timeoutInFixedSteps, 'La limite de temps en pas fixes');
  assertNonNegativeSafeInteger(currentFixedStep, 'Le numéro de pas fixe courant');

  if (evaluation.status === 'failed') return evaluation;
  if (currentFixedStep < rule.timeoutInFixedSteps) return evaluation;

  return fail('timeout', currentFixedStep);
};

export const resetAttemptFailureEvaluation = (): AttemptFailureEvaluation => initialEvaluation();

/**
 * Arbitrates the two independent evaluators. Victory wins over failure when
 * both conclude on the same fixed step: the goal is what the player was asked
 * to achieve, and a ball that has held its basket for the full duration has
 * achieved it — losing that attempt because the budget expired on the same
 * step would make the outcome depend on how late the winning step happened.
 * The arbitration lives here, and not inside either evaluator, so that each
 * one keeps reporting its own facts without knowing about the other.
 */
export const resolveAttemptOutcome = (
  goal: BasketGoalEvaluation,
  failure: AttemptFailureEvaluation,
): AttemptOutcome | null => {
  if (goal.status === 'succeeded') return { outcome: 'won' };
  if (failure.status === 'failed') return { outcome: 'lost', reason: failure.reason };
  return null;
};

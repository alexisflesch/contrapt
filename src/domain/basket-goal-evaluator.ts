export interface BasketGoalRule {
  readonly ballId: string;
  readonly basketId: string;
  readonly holdDurationInFixedSteps: number;
}

export interface SensorContactFact {
  readonly type: 'object-entered-sensor' | 'object-left-sensor';
  /** Identifier of the level placement crossing the sensor. */
  readonly placementId: string;
  /** Identifier of the level placement owning the sensor, never a physics handle. */
  readonly targetId: string;
  readonly fixedStep: number;
  /** Total order within a fixed step, assigned by the simulation adapter. */
  readonly order: number;
}

export interface BasketGoalEvaluation {
  readonly status: 'pending' | 'succeeded';
  readonly enteredAtFixedStep: number | null;
}

const initialEvaluation = (): BasketGoalEvaluation => ({
  status: 'pending',
  enteredAtFixedStep: null,
});

const assertNonNegativeSafeInteger = (value: number, label: string): void => {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`${label} doit être un entier sûr positif ou nul.`);
  }
};

const isTargetedContact = (fact: SensorContactFact, rule: BasketGoalRule): boolean =>
  fact.placementId === rule.ballId && fact.targetId === rule.basketId;

export const createBasketGoalEvaluation = (): BasketGoalEvaluation => initialEvaluation();

/**
 * Applies one already ordered semantic contact fact without mutating its inputs.
 * The sensor only reports contacts; this domain evaluator owns the goal outcome.
 */
export const applyBasketGoalFact = (
  evaluation: BasketGoalEvaluation,
  rule: BasketGoalRule,
  fact: SensorContactFact,
): BasketGoalEvaluation => {
  assertNonNegativeSafeInteger(fact.fixedStep, 'Le numéro de pas fixe');
  assertNonNegativeSafeInteger(fact.order, 'L’ordre du fait');

  if (!isTargetedContact(fact, rule)) return evaluation;

  switch (fact.type) {
    case 'object-entered-sensor':
      if (evaluation.enteredAtFixedStep !== null) return evaluation;
      return { status: 'pending', enteredAtFixedStep: fact.fixedStep };
    case 'object-left-sensor':
      return initialEvaluation();
  }
};

/** Applies a batch in its engine-independent `(fixedStep, order)` order. */
export const applyBasketGoalFacts = (
  evaluation: BasketGoalEvaluation,
  rule: BasketGoalRule,
  facts: readonly SensorContactFact[],
): BasketGoalEvaluation => {
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
    (currentEvaluation, fact) => applyBasketGoalFact(currentEvaluation, rule, fact),
    evaluation,
  );
};

/** Evaluates elapsed fixed steps; wall-clock time never enters the rule. */
export const advanceBasketGoalEvaluation = (
  evaluation: BasketGoalEvaluation,
  rule: BasketGoalRule,
  currentFixedStep: number,
): BasketGoalEvaluation => {
  assertNonNegativeSafeInteger(rule.holdDurationInFixedSteps, 'La durée de maintien');
  assertNonNegativeSafeInteger(currentFixedStep, 'Le numéro de pas fixe courant');

  if (evaluation.enteredAtFixedStep === null) return evaluation;
  if (currentFixedStep < evaluation.enteredAtFixedStep) {
    throw new RangeError('Le pas fixe courant ne peut pas précéder le fait d’entrée.');
  }

  const heldFixedSteps = currentFixedStep - evaluation.enteredAtFixedStep;
  const status = heldFixedSteps >= rule.holdDurationInFixedSteps ? 'succeeded' : 'pending';

  if (evaluation.status === status) return evaluation;
  return { status, enteredAtFixedStep: evaluation.enteredAtFixedStep };
};

export const resetBasketGoalEvaluation = (): BasketGoalEvaluation => initialEvaluation();

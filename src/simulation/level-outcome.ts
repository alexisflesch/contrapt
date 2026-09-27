import { resolveAttemptOutcome } from '../domain/attempt-failure-evaluator';
import type { LevelDocument } from '../domain/level-document';
import { createSimulationSession } from './simulation-session';

const FIXED_STEP_SECONDS = 1 / 60;
/** Far beyond the attempt timeout, which always concludes first: a guard, not a rule. */
const MAX_FIXED_STEPS = 60 * 60 * 5;

/**
 * U22: runs a level to its outcome with no player action during the run, at
 * a fixed step and without reading any clock, so that the same document
 * always gives the same answer. The export checks of the workshop use it.
 */
export const runLevelOutcome = (document: LevelDocument): 'won' | 'lost' => {
  const session = createSimulationSession(document, { fixedStepSeconds: FIXED_STEP_SECONDS });
  try {
    for (let step = 0; step < MAX_FIXED_STEPS; step += 1) {
      session.advanceFixedSteps(1);
      const outcome = resolveAttemptOutcome(
        session.readGoalEvaluation(),
        session.readFailureEvaluation(),
      );
      if (outcome !== null) return outcome.outcome;
    }
    return 'lost';
  } finally {
    session.destroy();
  }
};

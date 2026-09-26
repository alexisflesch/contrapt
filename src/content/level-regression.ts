import {
  createConstructionAttempt,
  movePlacement,
  placeFromInventory,
  rotatePlacement,
  type ConstructionErrorCode,
} from '../application/construction';
import { levelDocumentSchema, type LevelDocument } from '../domain/level-document';
import { resolveAttemptOutcome } from '../domain/attempt-failure-evaluator';
import { createSimulationSession, type SimulationSnapshot } from '../simulation/simulation-session';

const FIXED_STEP_SECONDS = 1 / 60;
const MAX_REGRESSION_FIXED_STEPS = 1_300;

export type LevelRunOutcome = 'succeeded' | 'out-of-scene' | 'timed-out';

export interface LevelRun {
  readonly outcome: LevelRunOutcome;
  readonly fixedSteps: number;
  readonly ballEnteredTarget: boolean;
  readonly finalState: SimulationSnapshot;
}

export type PlayerStep =
  | {
      readonly kind: 'place';
      readonly inventoryEntryId: string;
      readonly placementId: string;
      readonly x: number;
      readonly y: number;
      readonly rotationDegrees?: number;
    }
  | { readonly kind: 'move'; readonly placementId: string; readonly x: number; readonly y: number }
  | {
      readonly kind: 'rotate';
      readonly placementId: string;
      readonly rotationDegrees: number;
    };

const describePlayerStep = (step: PlayerStep): string => {
  switch (step.kind) {
    case 'place':
      return `pose « ${step.placementId} »`;
    case 'move':
      return `déplacement de « ${step.placementId} »`;
    case 'rotate':
      return `rotation de « ${step.placementId} »`;
  }
};

class PlayerStepError extends Error {
  readonly stepNumber: number;
  readonly reason: ConstructionErrorCode;

  constructor(stepNumber: number, step: PlayerStep, reason: ConstructionErrorCode) {
    super(`L’étape ${String(stepNumber)} (${describePlayerStep(step)}) a été refusée : ${reason}.`);
    this.name = 'PlayerStepError';
    this.stepNumber = stepNumber;
    this.reason = reason;
  }
}

const fixedStepOutcome = (reason: 'out-of-scene' | 'timeout'): LevelRunOutcome =>
  reason === 'out-of-scene' ? 'out-of-scene' : 'timed-out';

export const runLevel = (document: LevelDocument): LevelRun => {
  const level = levelDocumentSchema.parse(document);
  const session = createSimulationSession(level, { fixedStepSeconds: FIXED_STEP_SECONDS });
  let ballEnteredTarget = false;

  try {
    for (let step = 0; step < MAX_REGRESSION_FIXED_STEPS; step += 1) {
      session.advanceFixedSteps(1);
      const finalState = session.readState();
      ballEnteredTarget ||= finalState.events.some(
        (event) =>
          event.type === 'object-entered-sensor' &&
          event.placementId === level.goal.ballId &&
          event.targetId === level.goal.basketId,
      );

      const outcome = resolveAttemptOutcome(
        session.readGoalEvaluation(),
        session.readFailureEvaluation(),
      );
      if (outcome === null) continue;

      return {
        outcome: outcome.outcome === 'won' ? 'succeeded' : fixedStepOutcome(outcome.reason),
        fixedSteps: finalState.fixedStep,
        ballEnteredTarget,
        finalState,
      };
    }

    throw new Error(
      `La simulation n’a conclu ni succès ni échec après ${String(MAX_REGRESSION_FIXED_STEPS)} pas fixes.`,
    );
  } finally {
    session.destroy();
  }
};

export const applyPlayerSteps = (
  document: LevelDocument,
  steps: readonly PlayerStep[],
): LevelDocument => {
  let attempt = createConstructionAttempt(document);

  steps.forEach((step, index) => {
    const command = (() => {
      switch (step.kind) {
        case 'place':
          return placeFromInventory({
            context: 'player',
            inventoryEntryId: step.inventoryEntryId,
            placementId: step.placementId,
            transform: {
              position: { x: step.x, y: step.y },
              rotation: ((step.rotationDegrees ?? 0) * Math.PI) / 180,
            },
          });
        case 'move':
          return movePlacement({
            context: 'player',
            placementId: step.placementId,
            position: { x: step.x, y: step.y },
          });
        case 'rotate':
          return rotatePlacement({
            context: 'player',
            placementId: step.placementId,
            rotation: (step.rotationDegrees * Math.PI) / 180,
          });
      }
    })();

    const result = command.execute(attempt);
    if (result.status === 'rejected') {
      throw new PlayerStepError(index + 1, step, result.reason);
    }
    attempt = result.state;
  });

  return attempt.document;
};

export const searchSolutions = (
  document: LevelDocument,
  candidateGroups: readonly (readonly PlayerStep[])[],
): readonly PlayerStep[][] => {
  const solutions: PlayerStep[][] = [];
  const selectedSteps: PlayerStep[] = [];

  const evaluateSelection = (): void => {
    let candidateDocument: LevelDocument;
    try {
      candidateDocument = applyPlayerSteps(document, selectedSteps);
    } catch (error) {
      if (error instanceof PlayerStepError && error.reason === 'outside-build-zone') return;
      throw error;
    }

    if (runLevel(candidateDocument).outcome === 'succeeded') {
      solutions.push([...selectedSteps]);
    }
  };

  const selectFromGroup = (groupIndex: number): void => {
    if (groupIndex === candidateGroups.length) {
      evaluateSelection();
      return;
    }

    const candidates = candidateGroups[groupIndex];
    if (candidates === undefined) {
      throw new Error(`Le groupe de candidats ${String(groupIndex + 1)} est absent.`);
    }

    candidates.forEach((candidate) => {
      selectedSteps.push(candidate);
      selectFromGroup(groupIndex + 1);
      selectedSteps.pop();
    });
  };

  selectFromGroup(0);
  return solutions;
};

import { describe, expect, it } from 'vitest';

import { createSimulationSession } from '../../src/simulation/simulation-session';
import { selfSolvingLevel } from '../fixtures/self-solving-level';

describe('niveau de test qui se résout seul', () => {
  it('se résout seul : la machine en chaîne met la balle au panier', () => {
    const session = createSimulationSession(selfSolvingLevel, { fixedStepSeconds: 1 / 60 });
    let status = session.readGoalEvaluation().status;
    for (let step = 0; step < 20 * 60 && status === 'pending'; step += 1) {
      session.advanceFixedSteps(1);
      status = session.readGoalEvaluation().status;
    }
    session.destroy();

    expect(status).toBe('succeeded');
  });
});

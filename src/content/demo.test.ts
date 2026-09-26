import { describe, expect, it } from 'vitest';

import { createSimulationSession } from '../simulation/simulation-session';
import { embeddedDemoDocument } from './embedded-levels';

describe('démonstration', () => {
  it('se résout seule : la machine en chaîne met la balle au panier', () => {
    const session = createSimulationSession(embeddedDemoDocument, { fixedStepSeconds: 1 / 60 });
    let status = session.readGoalEvaluation().status;
    for (let step = 0; step < 20 * 60 && status === 'pending'; step += 1) {
      session.advanceFixedSteps(1);
      status = session.readGoalEvaluation().status;
    }
    session.destroy();

    expect(status).toBe('succeeded');
  });
});

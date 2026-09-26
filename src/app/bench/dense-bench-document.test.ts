import { describe, expect, it } from 'vitest';

import { createSimulationSession } from '../../simulation/simulation-session';
import { denseBenchDocument } from './dense-bench-document';

describe('scène dense du banc de performance', () => {
  it('atteint le budget provisoire de la scène 7 : au moins 30 corps dynamiques et 6 articulations', () => {
    const session = createSimulationSession(denseBenchDocument, { fixedStepSeconds: 1 / 60 });
    const dynamicBodies = session
      .readState()
      .bodies.filter((body) => body.bodyType === 'dynamic').length;

    expect(dynamicBodies).toBeGreaterThanOrEqual(30);
    expect(session.readResources().joints).toBeGreaterThanOrEqual(6);
    session.destroy();
  });

  it('garde la scène agitée pendant les 20 s simulées au lieu de s’arrêter sur une issue', () => {
    const session = createSimulationSession(denseBenchDocument, { fixedStepSeconds: 1 / 60 });
    session.advanceFixedSteps(1_190);

    expect(session.readGoalEvaluation().status).toBe('pending');
    expect(session.readFailureEvaluation().status).toBe('pending');
    session.destroy();
    // 1 190 dense steps take over a second alone, several under a full parallel run.
  }, 30_000);
});

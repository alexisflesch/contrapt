import { describe, expect, it } from 'vitest';

import { validatePhysicsTrace } from './physics-analysis';
import { runPlanckDropTrace } from './planck-adapter';

describe('adaptateur Planck de conformité', () => {
  it('produit une trace finie et stable pour la scène de chute initiale', () => {
    const trace = runPlanckDropTrace();

    expect(trace.candidateId).toBe('planck-1.5.0');
    expect(trace.scenarioId).toBe('drop-and-rest');
    expect(trace.frames).toHaveLength(181);
    expect(validatePhysicsTrace(trace)).toEqual([]);

    const initialBall = trace.frames[0]?.bodies[0];
    const finalBall = trace.frames.at(-1)?.bodies[0];
    expect(initialBall).toBeDefined();
    expect(finalBall).toBeDefined();
    expect(finalBall?.position.y).toBeLessThan(initialBall?.position.y ?? Number.NEGATIVE_INFINITY);
  });

  it('rejoue exactement la même scène dans le même runtime Node', () => {
    expect(runPlanckDropTrace()).toEqual(runPlanckDropTrace());
  });
});

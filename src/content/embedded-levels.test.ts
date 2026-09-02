import { describe, expect, it } from 'vitest';

import { embeddedLevels } from './embedded-levels';
import { createSimulationSession } from '../simulation/simulation-session';

describe('niveaux embarques', () => {
  it('expose la fixture du niveau 1 Laisser tomber comme un document v1 valide', () => {
    expect(embeddedLevels).toHaveLength(1);
    expect(embeddedLevels[0]).toMatchObject({
      schemaVersion: 1,
      id: 'level-1-laisser-tomber',
      metadata: { title: 'Laisser tomber' },
      inventory: [],
      buildZones: [],
      goal: { type: 'basket', ballId: 'ball-1', basketId: 'basket-1' },
    });

    const level = embeddedLevels[0];
    expect(level?.objects).toEqual([
      expect.objectContaining({
        id: 'ball-1',
        type: 'ball',
        permissions: { move: false, rotate: false, remove: false },
      }),
      expect.objectContaining({
        id: 'basket-1',
        type: 'basket',
        permissions: { move: false, rotate: false, remove: false },
      }),
    ]);
  });

  it('réussit par chute verticale dans un temps borné puis restaure exactement son snapshot initial', () => {
    const level = embeddedLevels[0];
    if (level === undefined) throw new Error('La fixture du niveau 1 est absente.');

    const session = createSimulationSession(level, { fixedStepSeconds: 1 / 60 });
    const initialSnapshot = session.readState();
    const maximumFixedSteps = 600;
    let observedTargetEntry = false;

    for (let fixedStep = 0; fixedStep < maximumFixedSteps; fixedStep += 1) {
      if (session.readGoalEvaluation().status === 'succeeded') break;
      session.advanceFixedSteps(1);
      observedTargetEntry ||= session
        .readState()
        .events.some(
          (event) =>
            event.type === 'object-entered-sensor' &&
            event.placementId === 'ball-1' &&
            event.targetId === 'basket-1',
        );
    }

    expect(session.readGoalEvaluation().status).toBe('succeeded');
    expect(observedTargetEntry).toBe(true);

    session.reset();

    expect(session.readState()).toEqual(initialSnapshot);
    expect(session.readGoalEvaluation().status).toBe('pending');
  });
});

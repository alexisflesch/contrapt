import { describe, expect, it } from 'vitest';

import { levelDocumentSchema, type LevelDocument } from '../domain/level-document';
import {
  createSimulationSession,
  type SimulationBodyState,
  type SimulationSensorEvent,
  type SimulationSensorEntryEvent,
  type SimulationSession,
  type SimulationSnapshot,
} from './simulation-session';

const FIXED_STEP_SECONDS = 1 / 60;

const permissions = { move: false, rotate: false, remove: false } as const;

const createLevelDocument = (ballY = 8): LevelDocument =>
  levelDocumentSchema.parse({
    schemaVersion: 2,
    id: 'physics-port-contract',
    metadata: { title: 'Contrat du port physique' },
    objects: [
      {
        id: 'ball-1',
        type: 'ball',
        transform: { position: { x: 0, y: ballY }, rotation: 0 },
        props: {},
        permissions,
      },
      {
        id: 'basket-1',
        type: 'basket',
        transform: { position: { x: 0, y: -6 }, rotation: 0 },
        props: {},
        permissions,
      },
      {
        id: 'beam-1',
        type: 'beam',
        transform: { position: { x: 0, y: 0 }, rotation: 0.25 },
        props: { size: 'medium' },
        permissions,
      },
      {
        id: 'seesaw-1',
        type: 'seesaw',
        transform: { position: { x: 4, y: 1 }, rotation: 0 },
        props: {},
        permissions,
      },
    ],
    inventory: [],
    goal: { type: 'basket', ballId: 'ball-1', basketId: 'basket-1' },
    buildZones: [{ min: { x: -10, y: -10 }, max: { x: 10, y: 12 } }],
    scene: { min: { x: -10, y: -10 }, max: { x: 10, y: 12 } },
  });

const createFreeBallLevelDocument = (): LevelDocument =>
  levelDocumentSchema.parse({
    schemaVersion: 2,
    id: 'physics-port-downward-gravity',
    metadata: { title: 'Contrat de gravité orientée vers le bas' },
    objects: [
      {
        id: 'ball-1',
        type: 'ball',
        transform: { position: { x: 0, y: 2 }, rotation: 0 },
        props: {},
        permissions,
      },
      {
        id: 'basket-1',
        type: 'basket',
        transform: { position: { x: 8, y: -8 }, rotation: 0 },
        props: {},
        permissions,
      },
    ],
    inventory: [],
    goal: { type: 'basket', ballId: 'ball-1', basketId: 'basket-1' },
    buildZones: [{ min: { x: -10, y: -10 }, max: { x: 10, y: 10 } }],
    scene: { min: { x: -10, y: -10 }, max: { x: 10, y: 10 } },
  });

const createBasketSensorLevelDocument = (): LevelDocument =>
  levelDocumentSchema.parse({
    schemaVersion: 2,
    id: 'physics-port-basket-sensor',
    metadata: { title: 'Contrat du capteur panier' },
    objects: [
      {
        id: 'ball-1',
        type: 'ball',
        // The ball starts above the inverted basket and falls into its sensor.
        transform: { position: { x: 0, y: -6.8 }, rotation: 0 },
        props: {},
        permissions,
      },
      {
        id: 'basket-1',
        type: 'basket',
        transform: { position: { x: 0, y: -6 }, rotation: Math.PI },
        props: {},
        permissions,
      },
    ],
    inventory: [],
    goal: { type: 'basket', ballId: 'ball-1', basketId: 'basket-1' },
    buildZones: [{ min: { x: -10, y: -10 }, max: { x: 10, y: 12 } }],
    scene: { min: { x: -10, y: -10 }, max: { x: 10, y: 12 } },
  });

const createBasketSensorExitLevelDocument = (basketX = 0): LevelDocument =>
  levelDocumentSchema.parse({
    schemaVersion: 2,
    id: 'physics-port-inverted-basket-sensor',
    metadata: { title: 'Contrat de sortie du capteur panier' },
    objects: [
      {
        id: 'ball-1',
        type: 'ball',
        // The ball starts inside the sensor and leaves through the open lower side.
        transform: { position: { x: 0, y: -5.9 }, rotation: 0 },
        props: {},
        permissions,
      },
      {
        id: 'basket-1',
        type: 'basket',
        transform: { position: { x: basketX, y: -6 }, rotation: 0 },
        props: {},
        permissions,
      },
    ],
    inventory: [],
    goal: { type: 'basket', ballId: 'ball-1', basketId: 'basket-1' },
    buildZones: [{ min: { x: -10, y: -10 }, max: { x: 10, y: 12 } }],
    scene: { min: { x: -10, y: -10 }, max: { x: 10, y: 12 } },
  });

const createSeesawImpactLevelDocument = (): LevelDocument =>
  levelDocumentSchema.parse({
    schemaVersion: 2,
    id: 'physics-port-seesaw-impact',
    metadata: { title: 'Contrat de l’impact sur la bascule' },
    objects: [
      {
        id: 'ball-1',
        type: 'ball',
        transform: { position: { x: -1, y: 3 }, rotation: 0 },
        props: {},
        permissions,
      },
      {
        id: 'basket-1',
        type: 'basket',
        transform: { position: { x: 10, y: -10 }, rotation: 0 },
        props: {},
        permissions,
      },
      {
        id: 'seesaw-1',
        type: 'seesaw',
        transform: { position: { x: 0, y: 6 }, rotation: 0 },
        props: {},
        permissions,
      },
    ],
    inventory: [],
    goal: { type: 'basket', ballId: 'ball-1', basketId: 'basket-1' },
    buildZones: [{ min: { x: -10, y: -12 }, max: { x: 12, y: 12 } }],
    scene: { min: { x: -10, y: -12 }, max: { x: 12, y: 12 } },
  });

const createBeamImpactLevelDocument = (beamX: number): LevelDocument =>
  levelDocumentSchema.parse({
    schemaVersion: 2,
    id: `physics-port-beam-impact-${String(beamX)}`,
    metadata: { title: 'Contrat de l’impact sur la poutre' },
    objects: [
      {
        id: 'ball-1',
        type: 'ball',
        transform: { position: { x: 0, y: 4 }, rotation: 0 },
        props: {},
        permissions,
      },
      {
        id: 'basket-1',
        type: 'basket',
        transform: { position: { x: 10, y: -10 }, rotation: 0 },
        props: {},
        permissions,
      },
      {
        id: 'beam-1',
        type: 'beam',
        transform: { position: { x: beamX, y: 8 }, rotation: 0 },
        props: { size: 'medium' },
        permissions,
      },
    ],
    inventory: [],
    goal: { type: 'basket', ballId: 'ball-1', basketId: 'basket-1' },
    buildZones: [{ min: { x: -12, y: -12 }, max: { x: 12, y: 12 } }],
    scene: { min: { x: -12, y: -12 }, max: { x: 12, y: 12 } },
  });

const isEventType = (event: { readonly type: string }, type: string): boolean =>
  event.type === type;

const isSensorEntryEvent = (event: SimulationSensorEvent): event is SimulationSensorEntryEvent =>
  event.type === 'object-entered-sensor';

type GoalEvaluationReader = SimulationSession & {
  readonly readGoalEvaluation: () => unknown;
};

const hasGoalEvaluation = (session: SimulationSession): session is GoalEvaluationReader =>
  'readGoalEvaluation' in session && typeof session.readGoalEvaluation === 'function';

const readGoalEvaluation = (session: SimulationSession): unknown => {
  if (!hasGoalEvaluation(session)) {
    throw new Error('L’API publique readGoalEvaluation est absente.');
  }
  return session.readGoalEvaluation();
};

const body = (
  snapshot: SimulationSnapshot,
  placementId: string,
  role: SimulationBodyState['role'],
): SimulationBodyState => {
  const found = snapshot.bodies.find(
    (candidate) => candidate.placementId === placementId && candidate.role === role,
  );
  if (found === undefined) {
    throw new Error(`Corps absent de l’état : ${placementId}/${role}`);
  }
  return found;
};

const withSession = (
  level: LevelDocument,
  callback: (session: SimulationSession) => void,
): void => {
  const session = createSimulationSession(level, { fixedStepSeconds: FIXED_STEP_SECONDS });
  try {
    callback(session);
  } finally {
    session.destroy();
  }
};

describe('port physique candidat-neutre', () => {
  it('construit une projection éphémère avec les corps et le pivot attendus', () => {
    const level = createLevelDocument();
    const levelBeforeSimulation = structuredClone(level);

    withSession(level, (session) => {
      const initial = session.readState();

      expect(initial.fixedStep).toBe(0);
      expect(initial.fixedStepSeconds).toBe(FIXED_STEP_SECONDS);
      expect(body(initial, 'ball-1', 'primary')).toMatchObject({
        position: { x: 0, y: 8 },
        rotation: 0,
        linearVelocity: { x: 0, y: 0 },
        angularVelocity: 0,
      });
      expect(body(initial, 'beam-1', 'primary')).toMatchObject({
        position: { x: 0, y: 0 },
        rotation: 0.25,
      });
      expect(body(initial, 'seesaw-1', 'base').role).toBe('base');
      expect(body(initial, 'seesaw-1', 'board').role).toBe('board');
      expect(initial.joints).toEqual([
        expect.objectContaining({ placementId: 'seesaw-1', type: 'revolute' }),
      ]);
      expect(level).toEqual(levelBeforeSimulation);
    });
  });

  it('progresse par nombre de pas fixes et reste déterministe sans horloge implicite', () => {
    const level = createLevelDocument();
    const first = createSimulationSession(level, { fixedStepSeconds: FIXED_STEP_SECONDS });
    const second = createSimulationSession(level, { fixedStepSeconds: FIXED_STEP_SECONDS });

    try {
      first.advanceFixedSteps(120);
      second.advanceFixedSteps(120);

      expect(first.readState().fixedStep).toBe(120);
      expect(first.readState()).toEqual(second.readState());
    } finally {
      first.destroy();
      second.destroy();
    }
  });

  it('fait tomber la balle, conserve la poutre statique et réinitialise la projection', () => {
    const level = createLevelDocument();
    const levelBeforeSimulation = structuredClone(level);

    withSession(level, (session) => {
      const initial = session.readState();
      const initialBeam = body(initial, 'beam-1', 'primary');
      const initialSeesawBase = body(initial, 'seesaw-1', 'base');
      const initialSeesawBoard = body(initial, 'seesaw-1', 'board');

      session.advanceFixedSteps(60);

      const advanced = session.readState();
      const advancedBall = body(advanced, 'ball-1', 'primary');
      const advancedBeam = body(advanced, 'beam-1', 'primary');
      const advancedSeesawBase = body(advanced, 'seesaw-1', 'base');
      const advancedSeesawBoard = body(advanced, 'seesaw-1', 'board');

      expect(advancedBall.position.y).toBeGreaterThan(
        body(initial, 'ball-1', 'primary').position.y,
      );
      expect(advancedBall.linearVelocity.y).toBeGreaterThan(0);
      expect(advancedBeam).toEqual(initialBeam);
      expect(advancedSeesawBase).toEqual(initialSeesawBase);
      expect(initialSeesawBoard.bodyType).toBe('dynamic');
      expect(advancedSeesawBoard.bodyType).toBe('dynamic');
      expect(level).toEqual(levelBeforeSimulation);

      session.reset();

      expect(session.readState()).toEqual(initial);
      expect(level).toEqual(levelBeforeSimulation);

      session.destroy();

      expect(level).toEqual(levelBeforeSimulation);
    });
  });

  it('fait augmenter y d’une balle libre avec la gravité écran vers le bas', () => {
    const session = createSimulationSession(createFreeBallLevelDocument(), {
      fixedStepSeconds: FIXED_STEP_SECONDS,
    });
    const measuredSteps = 4;

    try {
      const initialBall = body(session.readState(), 'ball-1', 'primary');

      session.advanceFixedSteps(measuredSteps);

      const advancedBall = body(session.readState(), 'ball-1', 'primary');
      const observedVerticalAcceleration =
        (advancedBall.linearVelocity.y - initialBall.linearVelocity.y) /
        (measuredSteps * FIXED_STEP_SECONDS);

      expect(observedVerticalAcceleration).toBeGreaterThan(0);
      expect(advancedBall.position.y).toBeGreaterThan(initialBall.position.y);
      expect(advancedBall.position.y).toBeGreaterThanOrEqual(0);
    } finally {
      session.destroy();
    }
  });

  it('isole défensivement le document source après sa création', () => {
    const level = createLevelDocument();
    const ball = level.objects.find((object) => object.id === 'ball-1');
    if (ball === undefined) {
      throw new Error('La fixture doit contenir ball-1.');
    }

    const session = createSimulationSession(level, { fixedStepSeconds: FIXED_STEP_SECONDS });
    try {
      ball.transform.position.y = 100;
      const levelAfterSourceMutation = structuredClone(level);

      expect(body(session.readState(), 'ball-1', 'primary').position.y).toBe(8);

      session.advanceFixedSteps(1);

      expect(body(session.readState(), 'ball-1', 'primary').position.y).toBeGreaterThan(8);
      expect(level).toEqual(levelAfterSourceMutation);

      session.reset();

      expect(body(session.readState(), 'ball-1', 'primary').position.y).toBe(8);
      expect(level).toEqual(levelAfterSourceMutation);

      session.destroy();

      expect(level).toEqual(levelAfterSourceMutation);
    } finally {
      session.destroy();
    }
  });

  it('expose seulement les événements nouvellement produits par le dernier pas', () => {
    const level = createBasketSensorLevelDocument();
    const levelBeforeSimulation = structuredClone(level);

    withSession(level, (session) => {
      // `events` is a per-step batch, not a cumulative history.
      expect(session.readState().events).toEqual([]);

      let enteredEvent: SimulationSensorEntryEvent | undefined;

      for (let step = 0; step < 30 && enteredEvent === undefined; step += 1) {
        session.advanceFixedSteps(1);
        const state = session.readState();

        expect(state.events.every((event) => event.fixedStep === state.fixedStep)).toBe(true);
        enteredEvent = state.events.find(
          (event): event is SimulationSensorEntryEvent =>
            isSensorEntryEvent(event) &&
            event.placementId === 'ball-1' &&
            event.targetId === 'basket-1',
        );
      }

      if (enteredEvent === undefined) {
        throw new Error('Aucun événement d’entrée du panier n’a été produit.');
      }
      expect(Number.isFinite(enteredEvent.fixedStep)).toBe(true);
      expect(Number.isSafeInteger(enteredEvent.fixedStep)).toBe(true);
      expect(enteredEvent).toEqual({
        type: 'object-entered-sensor',
        placementId: 'ball-1',
        targetId: 'basket-1',
        fixedStep: enteredEvent.fixedStep,
        order: 0,
      });

      session.advanceFixedSteps(1);

      expect(session.readState().events).not.toContainEqual(enteredEvent);
      expect(level).toEqual(levelBeforeSimulation);
    });
  });

  it('expose la sortie du capteur inversé comme un événement du dernier pas', () => {
    const level = createBasketSensorExitLevelDocument();

    withSession(level, (session) => {
      let leftEvent: SimulationSensorEvent | undefined;

      for (let step = 0; step < 60 && leftEvent === undefined; step += 1) {
        session.advanceFixedSteps(1);
        const state = session.readState();

        expect(state.events.every((event) => event.fixedStep === state.fixedStep)).toBe(true);
        leftEvent = state.events.find(
          (event) =>
            isEventType(event, 'object-left-sensor') &&
            event.placementId === 'ball-1' &&
            event.targetId === 'basket-1',
        );
      }

      if (leftEvent === undefined) {
        throw new Error('Aucun événement de sortie du panier n’a été produit.');
      }
      expect(Number.isFinite(leftEvent.fixedStep)).toBe(true);
      expect(Number.isSafeInteger(leftEvent.fixedStep)).toBe(true);
      expect(leftEvent).toEqual({
        type: 'object-left-sensor',
        placementId: 'ball-1',
        targetId: 'basket-1',
        fixedStep: leftEvent.fixedStep,
        order: 0,
      });

      session.advanceFixedSteps(1);

      expect(
        session.readState().events.find((event) => isEventType(event, 'object-left-sensor')),
      ).toBeUndefined();
    });
  });

  it('évalue réellement la réussite du panier après maintien suffisant', () => {
    const level = createBasketSensorLevelDocument();

    withSession(level, (session) => {
      let entryFixedStep: number | undefined;

      for (let step = 0; step < 60 && entryFixedStep === undefined; step += 1) {
        session.advanceFixedSteps(1);
        const entryEvent = session
          .readState()
          .events.find(
            (event) =>
              event.type === 'object-entered-sensor' &&
              event.placementId === 'ball-1' &&
              event.targetId === 'basket-1',
          );
        if (entryEvent !== undefined) {
          entryFixedStep = entryEvent.fixedStep;
        }
      }

      if (entryFixedStep === undefined) {
        throw new Error('Aucun événement d’entrée du panier n’a été produit.');
      }

      session.advanceFixedSteps(120);

      expect(readGoalEvaluation(session)).toEqual({
        status: 'succeeded',
        enteredAtFixedStep: entryFixedStep,
      });
    });
  });

  it('accumule une durée injectée sans avancer avant une période complète', () => {
    const level = createLevelDocument();

    withSession(level, (session) => {
      const halfPeriod = FIXED_STEP_SECONDS / 2;

      expect(session.advanceElapsedSeconds(halfPeriod)).toBe(0);
      expect(session.readState().fixedStep).toBe(0);

      expect(session.advanceElapsedSeconds(halfPeriod)).toBe(1);
      expect(session.readState().fixedStep).toBe(1);
    });
  });

  it('modifie la trajectoire après un impact sur une poutre statique', () => {
    const impactedSession = createSimulationSession(createBeamImpactLevelDocument(0), {
      fixedStepSeconds: FIXED_STEP_SECONDS,
    });
    const unobstructedSession = createSimulationSession(createBeamImpactLevelDocument(10), {
      fixedStepSeconds: FIXED_STEP_SECONDS,
    });

    try {
      const initialBeam = body(impactedSession.readState(), 'beam-1', 'primary');

      impactedSession.advanceFixedSteps(120);
      unobstructedSession.advanceFixedSteps(120);

      const impactedState = impactedSession.readState();
      const unobstructedState = unobstructedSession.readState();
      const impactedBall = body(impactedState, 'ball-1', 'primary');
      const unobstructedBall = body(unobstructedState, 'ball-1', 'primary');
      const impactedBeam = body(impactedState, 'beam-1', 'primary');

      expect(Math.abs(impactedBall.position.y - unobstructedBall.position.y)).toBeGreaterThan(0.25);
      expect(impactedBeam).toEqual(initialBeam);
    } finally {
      impactedSession.destroy();
      unobstructedSession.destroy();
    }
  });

  it('ne modifie pas la trajectoire lors d’un contact avec un capteur seul', () => {
    const sensorSession = createSimulationSession(createBasketSensorExitLevelDocument(), {
      fixedStepSeconds: FIXED_STEP_SECONDS,
    });
    const unobstructedSession = createSimulationSession(createBasketSensorExitLevelDocument(10), {
      fixedStepSeconds: FIXED_STEP_SECONDS,
    });
    let sensorEventObserved = false;
    let unobstructedEventObserved = false;

    try {
      for (let step = 0; step < 60; step += 1) {
        sensorSession.advanceFixedSteps(1);
        unobstructedSession.advanceFixedSteps(1);

        const sensorState = sensorSession.readState();
        const unobstructedState = unobstructedSession.readState();
        sensorEventObserved ||= sensorState.events.length > 0;
        unobstructedEventObserved ||= unobstructedState.events.length > 0;

        expect(sensorState.events.every((event) => event.fixedStep === sensorState.fixedStep)).toBe(
          true,
        );
        expect(unobstructedState.events).toEqual([]);
      }

      const sensorBall = body(sensorSession.readState(), 'ball-1', 'primary');
      const unobstructedBall = body(unobstructedSession.readState(), 'ball-1', 'primary');

      expect(sensorBall.position.x).toBeCloseTo(unobstructedBall.position.x, 9);
      expect(sensorBall.position.y).toBeCloseTo(unobstructedBall.position.y, 9);
      expect(sensorBall.linearVelocity.x).toBeCloseTo(unobstructedBall.linearVelocity.x, 9);
      expect(sensorBall.linearVelocity.y).toBeCloseTo(unobstructedBall.linearVelocity.y, 9);
      expect(sensorEventObserved).toBe(true);
      expect(unobstructedEventObserved).toBe(false);
    } finally {
      sensorSession.destroy();
      unobstructedSession.destroy();
    }
  });

  it('libère ses ressources et accepte une destruction répétée', () => {
    const session = createSimulationSession(createLevelDocument(), {
      fixedStepSeconds: FIXED_STEP_SECONDS,
    });

    expect(session.readResources()).toEqual({
      bodies: 5,
      colliders: 8,
      joints: 1,
      sensors: 1,
    });

    session.destroy();

    expect(session.readResources()).toEqual({
      bodies: 0,
      colliders: 0,
      joints: 0,
      sensors: 0,
    });
    expect(session.readState().bodies).toEqual([]);
    expect(() => session.destroy()).not.toThrow();
    expect(session.readResources()).toEqual({
      bodies: 0,
      colliders: 0,
      joints: 0,
      sensors: 0,
    });
  });

  it('fait pivoter la planche après un impact puis revient à son angle initial', () => {
    const level = createSeesawImpactLevelDocument();

    withSession(level, (session) => {
      const initialBoard = body(session.readState(), 'seesaw-1', 'board');

      session.advanceFixedSteps(180);

      const impactedBoard = body(session.readState(), 'seesaw-1', 'board');
      expect(Math.abs(impactedBoard.rotation - initialBoard.rotation)).toBeGreaterThan(0.01);

      session.reset();

      const resetBoard = body(session.readState(), 'seesaw-1', 'board');
      expect(resetBoard.rotation).toBeCloseTo(initialBoard.rotation, 5);
    });
  });
});

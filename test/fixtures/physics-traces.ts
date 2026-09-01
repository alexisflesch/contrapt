import type {
  PhysicsTrace,
  PhysicsTraceFrame,
  PhysicsTraceSensorEvent,
} from '../conformance/physics-protocol';

const body = (
  placementId: string,
  y: number,
  linearVelocityY: number,
): PhysicsTrace['frames'][number]['bodies'][number] => ({
  placementId,
  position: { x: 0, y },
  rotation: 0,
  linearVelocity: { x: 0, y: linearVelocityY },
  angularVelocity: 0,
});

const frame0: PhysicsTraceFrame = { fixedStep: 0, bodies: [body('ball-1', 3, -1)] };
const frame1: PhysicsTraceFrame = { fixedStep: 1, bodies: [body('ball-1', 2, -0.5)] };
const frame2: PhysicsTraceFrame = { fixedStep: 2, bodies: [body('ball-1', 1, 0.005)] };
const frame3: PhysicsTraceFrame = { fixedStep: 3, bodies: [body('ball-1', 1, 0.004)] };
const frame4: PhysicsTraceFrame = { fixedStep: 4, bodies: [body('ball-1', 1, 0.003)] };

const enteredBasket: PhysicsTraceSensorEvent = {
  type: 'object-entered-sensor',
  placementId: 'ball-1',
  targetId: 'basket-1',
  fixedStep: 2,
  order: 0,
};

const leftBasket: PhysicsTraceSensorEvent = {
  type: 'object-left-sensor',
  placementId: 'ball-1',
  targetId: 'basket-1',
  fixedStep: 4,
  order: 0,
};

export const stableTrace: PhysicsTrace = {
  protocolVersion: 1,
  candidateId: 'candidate-a',
  scenarioId: 'ball-drop',
  runId: 'run-1',
  fixedStepSeconds: 1 / 60,
  frames: [frame0, frame1, frame2, frame3, frame4],
  events: [enteredBasket, leftBasket],
};

export const traceWithTinyDrift: PhysicsTrace = {
  ...stableTrace,
  candidateId: 'candidate-b',
  runId: 'run-2',
  frames: stableTrace.frames.map((frame) => ({
    ...frame,
    bodies: frame.bodies.map((state) => ({
      ...state,
      position: { ...state.position, y: state.position.y + 0.000_001 },
    })),
  })),
};

export const malformedTraceCases: readonly {
  readonly name: string;
  readonly trace: PhysicsTrace;
  readonly issueCode: string;
}[] = [
  {
    name: 'valeur non finie',
    trace: {
      ...stableTrace,
      frames: [
        {
          ...frame0,
          bodies: [body('ball-1', Number.NaN, 0)],
        },
      ],
      events: [],
    },
    issueCode: 'non-finite-number',
  },
  {
    name: 'numéro de pas instable',
    trace: {
      ...stableTrace,
      frames: [frame0, { ...frame1, fixedStep: 2 }],
      events: [],
    },
    issueCode: 'non-contiguous-fixed-step',
  },
  {
    name: 'ordre de corps instable',
    trace: {
      ...stableTrace,
      frames: [
        {
          fixedStep: 0,
          bodies: [body('beam-1', 0, 0), body('ball-1', 0, 0)],
        },
      ],
      events: [],
    },
    issueCode: 'unstable-body-order',
  },
  {
    name: 'ordre événementiel instable',
    trace: {
      ...stableTrace,
      events: [
        { ...enteredBasket, order: 1 },
        { ...leftBasket, fixedStep: 2, order: 0 },
      ],
    },
    issueCode: 'unstable-event-order',
  },
  {
    name: 'sortie de capteur sans entrée',
    trace: {
      ...stableTrace,
      events: [{ ...leftBasket, fixedStep: 1 }],
    },
    issueCode: 'sensor-left-without-entry',
  },
  {
    name: 'double entrée de capteur',
    trace: {
      ...stableTrace,
      events: [enteredBasket, { ...enteredBasket, fixedStep: 3 }],
    },
    issueCode: 'duplicate-sensor-entry',
  },
];

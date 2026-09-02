import { Box, Circle, Vec2, World } from 'planck';

import type { PhysicsTrace, PhysicsTraceBodyState, PhysicsTraceFrame } from './physics-protocol';

const FIXED_STEP_SECONDS = 1 / 60;
const STEP_COUNT = 180;

interface TraceablePlanckBody {
  readonly getPosition: () => { readonly x: number; readonly y: number };
  readonly getLinearVelocity: () => { readonly x: number; readonly y: number };
  readonly getAngle: () => number;
  readonly getAngularVelocity: () => number;
}

const snapshotBall = (fixedStep: number, ball: TraceablePlanckBody): PhysicsTraceFrame => {
  const position = ball.getPosition();
  const linearVelocity = ball.getLinearVelocity();
  const body: PhysicsTraceBodyState = {
    placementId: 'ball-1',
    position: { x: position.x, y: position.y },
    rotation: ball.getAngle(),
    linearVelocity: { x: linearVelocity.x, y: linearVelocity.y },
    angularVelocity: ball.getAngularVelocity(),
  };

  return { fixedStep, bodies: [body] };
};

/**
 * First headless Planck scene. It belongs to the conformance harness only and
 * intentionally exposes no Planck types beyond this test boundary.
 */
export const runPlanckDropTrace = (): PhysicsTrace => {
  const world = new World(new Vec2(0, -9.81));
  const ball = world.createDynamicBody({ position: new Vec2(0, 4) });
  ball.createFixture(new Circle(0.25), { density: 1, friction: 0.3, restitution: 0 });

  const ground = world.createBody({ position: new Vec2(0, -0.5) });
  ground.createFixture(new Box(8, 0.5), { friction: 0.7, restitution: 0 });

  const frames: PhysicsTraceFrame[] = [snapshotBall(0, ball)];
  for (let fixedStep = 1; fixedStep <= STEP_COUNT; fixedStep += 1) {
    world.step(FIXED_STEP_SECONDS);
    frames.push(snapshotBall(fixedStep, ball));
  }

  return {
    protocolVersion: 1,
    candidateId: 'planck-1.5.0',
    scenarioId: 'drop-and-rest',
    runId: 'single-node-run',
    fixedStepSeconds: FIXED_STEP_SECONDS,
    frames,
    events: [],
  };
};

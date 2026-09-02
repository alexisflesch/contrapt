import RAPIER from '@dimforge/rapier2d-compat';
import { Box, Circle, RevoluteJoint, World as PlanckWorld } from 'planck';

import { analyzeLifecycle, type LifecycleAnalysis } from './lifecycle-analysis';

const FIXED_TIME_STEP_SECONDS = 1 / 60;

interface Scene6LifecycleOptions {
  readonly warmupCycles: number;
  readonly measuredCycles: number;
  readonly fixedStepsPerCycle: number;
}

interface NodeMemoryMeasurement {
  readonly heapUsedBytes: number;
  readonly rssBytes: number;
  readonly externalBytes: number;
  readonly arrayBuffersBytes: number;
}

interface Scene6LifecycleReport {
  readonly candidateId: 'planck-1.5.0' | 'rapier-0.20.0';
  readonly memoryMeasurements: readonly NodeMemoryMeasurement[];
  readonly analysis: LifecycleAnalysis;
  readonly liveObjectCountsAfterDestroy: readonly number[];
}

interface Scene6LifecycleComparison {
  readonly reports: readonly Scene6LifecycleReport[];
}

interface LifecycleCandidate {
  readonly candidateId: Scene6LifecycleReport['candidateId'];
  readonly runCycle: (fixedStepsPerCycle: number) => number;
}

const assertCycleCount = (name: string, count: number, allowZero: boolean): void => {
  const minimum = allowZero ? 0 : 1;
  if (!Number.isSafeInteger(count) || count < minimum) {
    throw new RangeError(`${name} doit être un entier supérieur ou égal à ${String(minimum)}.`);
  }
};

const measureNodeMemory = (): NodeMemoryMeasurement => {
  const { heapUsed, rss, external, arrayBuffers } = process.memoryUsage();
  return {
    heapUsedBytes: heapUsed,
    rssBytes: rss,
    externalBytes: external,
    arrayBuffersBytes: arrayBuffers,
  };
};

const runPlanckCycle = (fixedStepsPerCycle: number): number => {
  const world = new PlanckWorld({ gravity: { x: 0, y: -9.81 } });
  const anchor = world.createBody({ position: { x: 0, y: 0 } });
  const anchorFixture = anchor.createFixture(new Box(0.25, 0.25));
  const plank = world.createDynamicBody({ position: { x: 0, y: 0 } });
  const plankFixture = plank.createFixture(new Box(2, 0.15), { density: 1 });
  const ball = world.createDynamicBody({ position: { x: 0, y: 2 } });
  const ballFixture = ball.createFixture(new Circle(0.25), { density: 1 });
  const joint = world.createJoint(new RevoluteJoint({}, anchor, plank, { x: 0, y: 0 }));

  for (let step = 0; step < fixedStepsPerCycle; step += 1) {
    world.step(FIXED_TIME_STEP_SECONDS);
  }

  if (joint !== null) world.destroyJoint(joint);
  ball.destroyFixture(ballFixture);
  world.destroyBody(ball);
  plank.destroyFixture(plankFixture);
  world.destroyBody(plank);
  anchor.destroyFixture(anchorFixture);
  world.destroyBody(anchor);

  return world.getBodyCount() + world.getJointCount();
};

const runRapierCycle = (fixedStepsPerCycle: number): number => {
  const world = new RAPIER.World({ x: 0, y: -9.81 });
  world.timestep = FIXED_TIME_STEP_SECONDS;

  const anchor = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(0, 0));
  const anchorCollider = world.createCollider(RAPIER.ColliderDesc.cuboid(0.25, 0.25), anchor);
  const plank = world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(0, 0));
  const plankCollider = world.createCollider(RAPIER.ColliderDesc.cuboid(2, 0.15), plank);
  const ball = world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(0, 2));
  const ballCollider = world.createCollider(RAPIER.ColliderDesc.ball(0.25), ball);
  const joint = world.createImpulseJoint(
    RAPIER.JointData.revolute({ x: 0, y: 0 }, { x: 0, y: 0 }),
    anchor,
    plank,
    true,
  );

  for (let step = 0; step < fixedStepsPerCycle; step += 1) {
    world.step();
  }

  world.removeImpulseJoint(joint, true);
  world.removeCollider(ballCollider, true);
  world.removeRigidBody(ball);
  world.removeCollider(plankCollider, true);
  world.removeRigidBody(plank);
  world.removeCollider(anchorCollider, true);
  world.removeRigidBody(anchor);

  const liveObjectCount = world.bodies.len() + world.colliders.len() + world.impulseJoints.len();
  world.free();
  return liveObjectCount;
};

const runCandidate = (
  candidate: LifecycleCandidate,
  options: Scene6LifecycleOptions,
): Scene6LifecycleReport => {
  for (let cycle = 0; cycle < options.warmupCycles; cycle += 1) {
    candidate.runCycle(options.fixedStepsPerCycle);
  }

  const memoryMeasurements: NodeMemoryMeasurement[] = [];
  const liveObjectCountsAfterDestroy: number[] = [];
  for (let cycle = 0; cycle < options.measuredCycles; cycle += 1) {
    liveObjectCountsAfterDestroy.push(candidate.runCycle(options.fixedStepsPerCycle));
    memoryMeasurements.push(measureNodeMemory());
  }

  return {
    candidateId: candidate.candidateId,
    memoryMeasurements,
    analysis: analyzeLifecycle(
      memoryMeasurements.map(({ rssBytes }) => rssBytes),
      options.measuredCycles,
    ),
    liveObjectCountsAfterDestroy,
  };
};

export const runScene6LifecycleComparison = async (
  options: Scene6LifecycleOptions,
): Promise<Scene6LifecycleComparison> => {
  assertCycleCount('warmupCycles', options.warmupCycles, true);
  assertCycleCount('measuredCycles', options.measuredCycles, false);
  assertCycleCount('fixedStepsPerCycle', options.fixedStepsPerCycle, false);

  await RAPIER.init();

  return {
    reports: [
      runCandidate({ candidateId: 'planck-1.5.0', runCycle: runPlanckCycle }, options),
      runCandidate({ candidateId: 'rapier-0.20.0', runCycle: runRapierCycle }, options),
    ],
  };
};

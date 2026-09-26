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
  readonly memoryMeasurements: readonly NodeMemoryMeasurement[];
  readonly analysis: LifecycleAnalysis;
  readonly liveObjectCountsAfterDestroy: readonly number[];
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

const measurePlanckLifecycle = (options: Scene6LifecycleOptions): Scene6LifecycleReport => {
  for (let cycle = 0; cycle < options.warmupCycles; cycle += 1) {
    runPlanckCycle(options.fixedStepsPerCycle);
  }

  const memoryMeasurements: NodeMemoryMeasurement[] = [];
  const liveObjectCountsAfterDestroy: number[] = [];
  for (let cycle = 0; cycle < options.measuredCycles; cycle += 1) {
    liveObjectCountsAfterDestroy.push(runPlanckCycle(options.fixedStepsPerCycle));
    memoryMeasurements.push(measureNodeMemory());
  }

  return {
    memoryMeasurements,
    analysis: analyzeLifecycle(
      memoryMeasurements.map(({ rssBytes }) => rssBytes),
      options.measuredCycles,
    ),
    liveObjectCountsAfterDestroy,
  };
};

export const runScene6Lifecycle = (options: Scene6LifecycleOptions): Scene6LifecycleReport => {
  assertCycleCount('warmupCycles', options.warmupCycles, true);
  assertCycleCount('measuredCycles', options.measuredCycles, false);
  assertCycleCount('fixedStepsPerCycle', options.fixedStepsPerCycle, false);

  return measurePlanckLifecycle(options);
};

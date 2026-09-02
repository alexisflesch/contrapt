import RAPIER from '@dimforge/rapier2d-compat';
import { Box, Circle, RevoluteJoint, World as PlanckWorld } from 'planck';
import type { Body as PlanckBody } from 'planck';

import { calculateDurationPercentiles } from './physics-analysis';

const PARAMETERS = {
  fixedTimeStep: 1 / 60,
  warmupSteps: 120,
  measuredSteps: 600,
  repetitions: 5,
} as const;

const SAMPLING_POLICY = {
  warmupSteps: PARAMETERS.warmupSteps,
  measuredSteps: PARAMETERS.measuredSteps,
  repetitions: PARAMETERS.repetitions,
  durationScope: 'measured-steps-only',
  observationPoint: 'after-measured-steps-before-destroy',
} as const;

const MATERIAL = {
  density: 1,
  friction: 0.5,
  restitution: 0.1,
} as const;

interface Position {
  readonly x: number;
  readonly y: number;
}

interface BallDescription {
  readonly kind: 'ball';
  readonly id: string;
  readonly position: Position;
  readonly radius: number;
}

interface BoxDescription {
  readonly kind: 'basket' | 'beam';
  readonly id: string;
  readonly position: Position;
  readonly angle: number;
  readonly halfWidth: number;
  readonly halfHeight: number;
}

interface SeesawDescription {
  readonly kind: 'seesaw';
  readonly id: string;
  readonly position: Position;
  readonly boardHalfWidth: number;
  readonly boardHalfHeight: number;
  readonly baseHalfWidth: number;
  readonly baseHalfHeight: number;
}

type SceneObjectDescription = BallDescription | BoxDescription | SeesawDescription;

const beamDescriptions: readonly BoxDescription[] = Array.from({ length: 16 }, (_, index) => ({
  kind: 'beam',
  id: `beam-${String(index + 1).padStart(2, '0')}`,
  position: {
    x: -7.5 + (index % 8) * 2.15,
    y: -4 + Math.floor(index / 8) * 2,
  },
  angle: index % 2 === 0 ? 0.08 : -0.08,
  halfWidth: 0.9,
  halfHeight: 0.12,
}));

const seesawDescriptions: readonly SeesawDescription[] = Array.from({ length: 6 }, (_, index) => ({
  kind: 'seesaw',
  id: `seesaw-${String(index + 1).padStart(2, '0')}`,
  position: { x: -7.5 + index * 3, y: 2.5 },
  boardHalfWidth: 1.25,
  boardHalfHeight: 0.12,
  baseHalfWidth: 0.22,
  baseHalfHeight: 0.35,
}));

const SCENE_OBJECTS: readonly SceneObjectDescription[] = [
  {
    kind: 'ball',
    id: 'ball-01',
    position: { x: 0, y: 9 },
    radius: 0.35,
  },
  {
    kind: 'basket',
    id: 'basket-01',
    position: { x: 0, y: -6 },
    angle: 0,
    halfWidth: 10,
    halfHeight: 0.25,
  },
  ...beamDescriptions,
  ...seesawDescriptions,
];

interface DensitySimulation {
  readonly step: () => void;
  readonly captureObservation: () => DensityObservationBeforeDestroy;
  readonly destroy: () => PhysicsResourceCounts;
}

type CandidateId = 'planck-1.5.0' | 'rapier-0.20.0';

interface DensityCandidate {
  readonly candidateId: CandidateId;
  readonly createSimulation: () => DensitySimulation;
}

interface DensityPercentiles {
  readonly p50: number;
  readonly p95: number;
  readonly p99: number;
}

interface PhysicsResourceCounts {
  readonly bodies: number;
  readonly colliders: number;
  readonly joints: number;
}

interface DensitySnapshotBody {
  readonly placementId: string;
  readonly position: Position;
  readonly linearVelocity: Position;
}

interface DensitySnapshot {
  readonly bodies: readonly DensitySnapshotBody[];
}

interface DensityObservationBeforeDestroy {
  readonly countsBeforeDestroy: PhysicsResourceCounts;
  readonly snapshot: DensitySnapshot;
}

interface DensityObservation extends DensityObservationBeforeDestroy {
  readonly countsAfterDestroy: PhysicsResourceCounts;
}

interface DensityMeasurement {
  readonly candidateId: CandidateId;
  readonly durationsMs: readonly number[];
  readonly percentiles: DensityPercentiles;
  readonly observations: readonly DensityObservation[];
}

interface Scene7DensityHarness {
  readonly fixture: {
    readonly objectOrder: readonly string[];
    readonly bodyBreakdown: {
      readonly ball: 1;
      readonly basket: 1;
      readonly beam: 16;
      readonly seesawBase: 6;
      readonly seesawBoard: 6;
    };
    readonly physicalBodyCount: 30;
    readonly jointCount: 6;
    readonly usesClock: false;
    readonly usesRandom: false;
  };
  readonly parameters: typeof PARAMETERS;
  readonly samplingPolicy: typeof SAMPLING_POLICY;
  readonly measurements: readonly DensityMeasurement[];
}

interface PlanckSnapshotSource {
  readonly placementId: string;
  readonly body: PlanckBody;
}

interface RapierSnapshotSource {
  readonly placementId: string;
  readonly body: RAPIER.RigidBody;
}

const sortSnapshotBodies = (
  bodies: readonly DensitySnapshotBody[],
): readonly DensitySnapshotBody[] =>
  [...bodies].sort(({ placementId: left }, { placementId: right }) => left.localeCompare(right));

const readRapierCounts = (world: RAPIER.World): PhysicsResourceCounts => ({
  bodies: world.bodies.len(),
  colliders: world.colliders.len(),
  joints: world.impulseJoints.len(),
});

const createPlanckSimulation = (): DensitySimulation => {
  const world = new PlanckWorld({ gravity: { x: 0, y: -9.81 } });
  const snapshotSources: PlanckSnapshotSource[] = [];
  const readCounts = (): PhysicsResourceCounts => {
    let fixtureCount = 0;
    for (let body = world.getBodyList(); body !== null; body = body.getNext()) {
      for (let fixture = body.getFixtureList(); fixture !== null; fixture = fixture.getNext()) {
        fixtureCount += 1;
      }
    }

    return {
      bodies: world.getBodyCount(),
      colliders: fixtureCount,
      joints: world.getJointCount(),
    };
  };

  for (const object of SCENE_OBJECTS) {
    switch (object.kind) {
      case 'ball': {
        const body = world.createDynamicBody({ position: object.position });
        body.createFixture(new Circle(object.radius), MATERIAL);
        snapshotSources.push({ placementId: object.id, body });
        break;
      }
      case 'basket':
      case 'beam': {
        const body = world.createBody({ position: object.position, angle: object.angle });
        body.createFixture(new Box(object.halfWidth, object.halfHeight), MATERIAL);
        snapshotSources.push({ placementId: object.id, body });
        break;
      }
      case 'seesaw': {
        const base = world.createBody({ position: object.position });
        base.createFixture(new Box(object.baseHalfWidth, object.baseHalfHeight), MATERIAL);
        snapshotSources.push({ placementId: `${object.id}:base`, body: base });

        const board = world.createDynamicBody({ position: object.position });
        board.createFixture(new Box(object.boardHalfWidth, object.boardHalfHeight), MATERIAL);
        snapshotSources.push({ placementId: `${object.id}:board`, body: board });

        world.createJoint(new RevoluteJoint({}, base, board, object.position));
        break;
      }
    }
  }

  let countsAfterDestroy: PhysicsResourceCounts | undefined;
  return {
    step: () => {
      world.step(PARAMETERS.fixedTimeStep);
    },
    captureObservation: () => ({
      countsBeforeDestroy: readCounts(),
      snapshot: {
        bodies: sortSnapshotBodies(
          snapshotSources.map(({ placementId, body }) => {
            const position = body.getPosition();
            const linearVelocity = body.getLinearVelocity();
            return {
              placementId,
              position: { x: position.x, y: position.y },
              linearVelocity: { x: linearVelocity.x, y: linearVelocity.y },
            };
          }),
        ),
      },
    }),
    destroy: () => {
      if (countsAfterDestroy !== undefined) return countsAfterDestroy;

      for (let joint = world.getJointList(); joint !== null; ) {
        const nextJoint = joint.getNext();
        world.destroyJoint(joint);
        joint = nextJoint;
      }
      for (let body = world.getBodyList(); body !== null; ) {
        const nextBody = body.getNext();
        for (let fixture = body.getFixtureList(); fixture !== null; ) {
          const nextFixture = fixture.getNext();
          body.destroyFixture(fixture);
          fixture = nextFixture;
        }
        world.destroyBody(body);
        body = nextBody;
      }

      countsAfterDestroy = readCounts();
      return countsAfterDestroy;
    },
  };
};

const createRapierSimulation = (): DensitySimulation => {
  const world = new RAPIER.World({ x: 0, y: -9.81 });
  world.timestep = PARAMETERS.fixedTimeStep;
  const snapshotSources: RapierSnapshotSource[] = [];

  const createCollider = (
    descriptor: RAPIER.ColliderDesc,
    body: RAPIER.RigidBody,
  ): RAPIER.Collider => {
    const collider = world.createCollider(
      descriptor
        .setDensity(MATERIAL.density)
        .setFriction(MATERIAL.friction)
        .setRestitution(MATERIAL.restitution),
      body,
    );
    return collider;
  };

  for (const object of SCENE_OBJECTS) {
    switch (object.kind) {
      case 'ball': {
        const body = world.createRigidBody(
          RAPIER.RigidBodyDesc.dynamic().setTranslation(object.position.x, object.position.y),
        );
        createCollider(RAPIER.ColliderDesc.ball(object.radius), body);
        snapshotSources.push({ placementId: object.id, body });
        break;
      }
      case 'basket':
      case 'beam': {
        const body = world.createRigidBody(
          RAPIER.RigidBodyDesc.fixed()
            .setTranslation(object.position.x, object.position.y)
            .setRotation(object.angle),
        );
        createCollider(RAPIER.ColliderDesc.cuboid(object.halfWidth, object.halfHeight), body);
        snapshotSources.push({ placementId: object.id, body });
        break;
      }
      case 'seesaw': {
        const base = world.createRigidBody(
          RAPIER.RigidBodyDesc.fixed().setTranslation(object.position.x, object.position.y),
        );
        createCollider(
          RAPIER.ColliderDesc.cuboid(object.baseHalfWidth, object.baseHalfHeight),
          base,
        );
        snapshotSources.push({ placementId: `${object.id}:base`, body: base });

        const board = world.createRigidBody(
          RAPIER.RigidBodyDesc.dynamic().setTranslation(object.position.x, object.position.y),
        );
        createCollider(
          RAPIER.ColliderDesc.cuboid(object.boardHalfWidth, object.boardHalfHeight),
          board,
        );
        snapshotSources.push({ placementId: `${object.id}:board`, body: board });

        world.createImpulseJoint(
          RAPIER.JointData.revolute({ x: 0, y: 0 }, { x: 0, y: 0 }),
          base,
          board,
          true,
        );
        break;
      }
    }
  }

  let countsAfterDestroy: PhysicsResourceCounts | undefined;
  return {
    step: () => {
      world.step();
    },
    captureObservation: () => ({
      countsBeforeDestroy: readRapierCounts(world),
      snapshot: {
        bodies: sortSnapshotBodies(
          snapshotSources.map(({ placementId, body }) => {
            const position = body.translation();
            const linearVelocity = body.linvel();
            return {
              placementId,
              position: { x: position.x, y: position.y },
              linearVelocity: { x: linearVelocity.x, y: linearVelocity.y },
            };
          }),
        ),
      },
    }),
    destroy: () => {
      if (countsAfterDestroy !== undefined) return countsAfterDestroy;

      for (const joint of world.impulseJoints.getAll()) world.removeImpulseJoint(joint, true);
      for (const collider of world.colliders.getAll()) world.removeCollider(collider, true);
      for (const body of world.bodies.getAll()) world.removeRigidBody(body);

      countsAfterDestroy = readRapierCounts(world);
      world.free();
      return countsAfterDestroy;
    },
  };
};

const measureCandidate = (candidate: DensityCandidate): DensityMeasurement => {
  const durationsMs: number[] = [];
  const observations: DensityObservation[] = [];

  for (let repetition = 0; repetition < PARAMETERS.repetitions; repetition += 1) {
    const simulation = candidate.createSimulation();
    try {
      for (let step = 0; step < PARAMETERS.warmupSteps; step += 1) simulation.step();

      const startedAt = performance.now();
      for (let step = 0; step < PARAMETERS.measuredSteps; step += 1) simulation.step();
      const durationMs = performance.now() - startedAt;
      if (!Number.isFinite(durationMs) || durationMs < 0) {
        throw new RangeError('La durée mesurée doit être finie et positive ou nulle.');
      }
      durationsMs.push(durationMs);

      const observation = simulation.captureObservation();
      const countsAfterDestroy = simulation.destroy();
      observations.push({ ...observation, countsAfterDestroy });
    } finally {
      simulation.destroy();
    }
  }

  const percentiles = calculateDurationPercentiles(durationsMs);
  return {
    candidateId: candidate.candidateId,
    durationsMs,
    observations,
    percentiles: {
      p50: percentiles.p50Milliseconds,
      p95: percentiles.p95Milliseconds,
      p99: percentiles.p99Milliseconds,
    },
  };
};

// Rapier initialise son module WebAssembly de manière asynchrone. L'attente au
// chargement garde createScene7DensityHarness synchrone, comme le contrat de test.
await RAPIER.init();

export const createScene7DensityHarness = (): Scene7DensityHarness => ({
  fixture: {
    objectOrder: SCENE_OBJECTS.map(({ id }) => id),
    bodyBreakdown: {
      ball: 1,
      basket: 1,
      beam: 16,
      seesawBase: 6,
      seesawBoard: 6,
    },
    physicalBodyCount: 30,
    jointCount: 6,
    usesClock: false,
    usesRandom: false,
  },
  parameters: PARAMETERS,
  samplingPolicy: SAMPLING_POLICY,
  measurements: [
    measureCandidate({ candidateId: 'planck-1.5.0', createSimulation: createPlanckSimulation }),
    measureCandidate({ candidateId: 'rapier-0.20.0', createSimulation: createRapierSimulation }),
  ],
});

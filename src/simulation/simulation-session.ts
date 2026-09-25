import {
  Box,
  Circle,
  Polygon,
  RevoluteJoint,
  Vec2,
  World,
  type Body,
  type Contact,
  type Fixture,
  type FixtureDef,
  type Joint,
} from 'planck';

import {
  ballGeometry,
  basketGeometry,
  beamGeometry,
  conveyorGeometry,
  leverAngle,
  leverGeometry,
  massGeometry,
  seesawGeometry,
  type LeverPosition,
  type WorldPolygon,
} from '../domain/family-geometry';
import type { LevelDocument } from '../domain/level-document';
import {
  advanceAttemptFailureEvaluation,
  applyAttemptFailureFacts,
  createAttemptFailureEvaluation,
  resetAttemptFailureEvaluation,
  type AttemptFailureEvaluation,
  type AttemptFailureRule,
  type BallPositionFact,
} from '../domain/attempt-failure-evaluator';
import {
  advanceBasketGoalEvaluation,
  applyBasketGoalFacts,
  createBasketGoalEvaluation,
  resetBasketGoalEvaluation,
  type BasketGoalEvaluation,
  type BasketGoalRule,
} from '../domain/basket-goal-evaluator';

interface SimulationVector {
  readonly x: number;
  readonly y: number;
}

type SimulationBodyRole = 'primary' | 'base' | 'board' | 'handle';
type SimulationBodyType = 'static' | 'dynamic';

export interface SimulationBodyState {
  readonly placementId: string;
  readonly role: SimulationBodyRole;
  readonly bodyType: SimulationBodyType;
  readonly position: SimulationVector;
  readonly rotation: number;
  readonly linearVelocity: SimulationVector;
  readonly angularVelocity: number;
}

interface SimulationJointState {
  readonly placementId: string;
  readonly type: 'revolute';
  readonly bodyARole: 'base';
  readonly bodyBRole: 'board' | 'handle';
  readonly anchor: SimulationVector;
}

type ConveyorDirection = -1 | 0 | 1;

/**
 * ADR 0009: the observable state of controllers and devices after a step.
 * A lever's position is read from its handle's angle; a conveyor's
 * direction comes from its lever if wired, from its own property otherwise.
 */
type SimulationDeviceState =
  | {
      readonly placementId: string;
      readonly kind: 'lever';
      readonly position: LeverPosition;
    }
  | {
      readonly placementId: string;
      readonly kind: 'conveyor';
      readonly direction: ConveyorDirection;
      /** Last non-zero direction, so a stopped belt keeps facing where it went. */
      readonly facing: -1 | 1;
      /** Signed distance travelled by the belt since the start, in world units. */
      readonly beltOffset: number;
    };

interface SimulationSensorEventFields {
  readonly placementId: string;
  readonly targetId: string;
  readonly fixedStep: number;
  readonly order: number;
}

export interface SimulationSensorEntryEvent extends SimulationSensorEventFields {
  readonly type: 'object-entered-sensor';
}

interface SimulationSensorExitEvent extends SimulationSensorEventFields {
  readonly type: 'object-left-sensor';
}

export type SimulationSensorEvent = SimulationSensorEntryEvent | SimulationSensorExitEvent;

export interface SimulationSnapshot {
  readonly fixedStep: number;
  readonly fixedStepSeconds: number;
  readonly bodies: readonly SimulationBodyState[];
  readonly joints: readonly SimulationJointState[];
  readonly events: readonly SimulationSensorEvent[];
  readonly devices: readonly SimulationDeviceState[];
}

interface SimulationResources {
  readonly bodies: number;
  readonly colliders: number;
  readonly joints: number;
  readonly sensors: number;
}

interface SimulationSessionOptions {
  readonly fixedStepSeconds: number;
  /** Budget of one attempt, in simulated seconds. Defaults to `DEFAULT_ATTEMPT_TIMEOUT_SECONDS`. */
  readonly attemptTimeoutSeconds?: number;
}

export interface SimulationSession {
  readState(): SimulationSnapshot;
  readResources(): SimulationResources;
  readGoalEvaluation(): BasketGoalEvaluation;
  readFailureEvaluation(): AttemptFailureEvaluation;
  advanceFixedSteps(count: number): void;
  advanceElapsedSeconds(elapsedSeconds: number): number;
  reset(): void;
  destroy(): boolean;
}

interface BodyRecord {
  readonly placementId: string;
  readonly role: SimulationBodyRole;
  readonly handle: Body;
}

interface RevoluteJointRecord {
  readonly placementId: string;
  readonly handle: Joint;
  readonly moving: 'board' | 'handle';
}

/** The one joint operation a lever's notches need. */
interface LeverJoint {
  readonly setMotorSpeed: (speed: number) => void;
}

interface LeverRecord {
  readonly placementId: string;
  readonly base: Body;
  readonly handle: Body;
  readonly joint: LeverJoint;
}

interface ConveyorRecord {
  readonly placementId: string;
  readonly body: Body;
  readonly ownDirection: ConveyorDirection;
  readonly leverId: string | undefined;
  direction: ConveyorDirection;
  facing: -1 | 1;
  beltOffset: number;
}

interface SensorRecord {
  readonly targetId: string;
}

/* ADR 0007 - Repère du monde : `y` croît vers le bas, comme à l'écran. Tout
 * offset de collider se lit donc « vers le bas quand il est positif ». Une
 * géométrie écrite en `y` vers le haut est un bug, et se corrige ici, jamais
 * par une rotation compensatoire dans le contenu. */

const GRAVITY = 9.81;
const BALL_RADIUS = ballGeometry.radius;
const BEAM_HALF_THICKNESS = beamGeometry.thickness / 2;
/** Half of the frozen 1,5 × 1,1 basket footprint (ADR 0007), walls included. */
const BASKET_HALF_WIDTH = basketGeometry.footprint.width / 2;
const BASKET_WALL_HALF_HEIGHT = basketGeometry.footprint.height / 2;
const BASKET_SENSOR_HALF_HEIGHT = 0.5;
const BASKET_WALL_HALF_THICKNESS = 0.08;
/**
 * Walls and floor are inset by their own half thickness so that their outer
 * faces land exactly on the frozen footprint: the sprite drawn by the board
 * renderer and the collider then cover the same rectangle, with no per-asset
 * correction factor.
 */
const BASKET_WALL_OFFSET_X = BASKET_HALF_WIDTH - BASKET_WALL_HALF_THICKNESS;
const BASKET_FLOOR_OFFSET_Y = BASKET_WALL_HALF_HEIGHT - BASKET_WALL_HALF_THICKNESS;
/** The fulcrum stands under the pivot, which is where the board is hinged. */
const SEESAW_FULCRUM_VERTICES = seesawGeometry.fulcrum.polygon.map(({ x, y }) => new Vec2(x, y));
const SEESAW_ANGLE_LIMIT = Math.PI / 6;
/**
 * Box2D has friction but no rolling resistance: a ball rolling without
 * slipping keeps its energy forever, and on a belt friction mostly spins it
 * in place. A resisting torque of `coefficient × m × g × r`, applied while
 * the ball touches something, lets it come to rest and be carried along.
 * The coefficient is a game value, higher than a real ball on wood, so that
 * stops are readable on a small screen.
 */
const ROLLING_RESISTANCE_COEFFICIENT = 0.1;

/** The printed weight is the physical mass, in kilograms (the ball weighs about 0,28). */
const MASS_KILOGRAMS = { '10kg': 10 } as const;
const MASS_VERTICES = massGeometry.polygon.map(({ x, y }) => new Vec2(x, y));

const polygonArea = (polygon: WorldPolygon): number =>
  Math.abs(
    polygon.reduce((sum, point, index) => {
      const next = polygon[(index + 1) % polygon.length] ?? point;
      return sum + point.x * next.y - next.x * point.y;
    }, 0),
  ) / 2;

const MASS_AREA = polygonArea(massGeometry.polygon);

const LEVER_BASE_VERTICES = leverGeometry.base.polygon.map(({ x, y }) => new Vec2(x, y));
/**
 * The lever has three notches. A torque-limited motor pulls the handle to
 * the notch it is closest to: enough to hold it upright against gravity
 * (under 0,3 N·m this close to vertical), far too little to resist a ball.
 * The side notches rest against the joint's limits.
 */
const LEVER_NOTCH_TORQUE = 0.35;
/** Motor speed per radian away from the notch, in s⁻¹. */
const LEVER_NOTCH_STIFFNESS = 12;
/** Past this angle either side of upright, the lever reads as left or right. */
const LEVER_SWITCH_ANGLE = leverGeometry.tilt / 2;
const CONVEYOR_SPEED = 1.5;
const conveyorDirections = { left: -1, stopped: 0, right: 1 } as const;

const leverPositionFromAngle = (angle: number): LeverPosition =>
  angle <= -LEVER_SWITCH_ANGLE ? 'left' : angle >= LEVER_SWITCH_ANGLE ? 'right' : 'center';
/**
 * Global game rule: the target ball must remain in its basket for thirty
 * complete fixed steps, half a second at 60 Hz. A ball merely crossing the
 * sensor must not win.
 */
const BASKET_GOAL_HOLD_DURATION_IN_FIXED_STEPS = 30;
/**
 * Global game rule (B2, plan-remise-en-jeu.md § 4): the attempt is lost as
 * soon as the target ball's centre leaves the level's scene rectangle widened
 * by this margin on every side. The world has no implicit walls — a level that
 * wants a floor lays a static beam — so this is what ends a fall into nothing.
 */
const OUT_OF_SCENE_MARGIN_IN_WORLD_UNITS = 2;
/**
 * Global game rule (B2): an attempt that neither wins nor leaves the scene is
 * given twenty simulated seconds. Converted to fixed steps below, because the
 * domain evaluator counts steps and never seconds.
 */
const DEFAULT_ATTEMPT_TIMEOUT_SECONDS = 20;

const createPhysicsWorld = () =>
  // Sleeping is what stops a settled ball from vibrating forever.
  new World({ gravity: new Vec2(0, GRAVITY), allowSleep: true });

const assertPositiveFinite = (value: number, label: string): void => {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError(`${label} doit être un nombre fini strictement positif.`);
  }
};

const assertNonNegativeFinite = (value: number, label: string): void => {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${label} doit être un nombre fini positif ou nul.`);
  }
};

const assertNonNegativeSafeInteger = (value: number, label: string): void => {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`${label} doit être un entier sûr positif ou nul.`);
  }
};

const assertPositiveSafeInteger = (value: number, label: string): void => {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new RangeError(`${label} doit être un entier sûr strictement positif.`);
  }
};

const bodyType = (body: Body): SimulationBodyType => {
  const type = body.getType();
  if (type === 'static') return 'static';
  if (type === 'dynamic') return 'dynamic';
  throw new Error(`Type de corps physique non exposable : ${type}.`);
};

class PlanckSimulationSession implements SimulationSession {
  readonly #level: LevelDocument;
  readonly #fixedStepSeconds: number;
  readonly #goalRule: BasketGoalRule;
  readonly #failureRule: AttemptFailureRule;

  #world: ReturnType<typeof createPhysicsWorld> | null = null;
  #bodies: BodyRecord[] = [];
  #colliders = new Set<Fixture>();
  #joints: RevoluteJointRecord[] = [];
  #balls: Body[] = [];
  #levers: LeverRecord[] = [];
  #conveyors: ConveyorRecord[] = [];
  #conveyorFixtures = new Map<Fixture, ConveyorRecord>();
  #sensors = new Map<Fixture, SensorRecord>();
  #activeSensorContacts = new Map<string, number>();
  #events: SimulationSensorEvent[] = [];
  #goalEvaluation = createBasketGoalEvaluation();
  #failureEvaluation = createAttemptFailureEvaluation();
  #fixedStep = 0;
  #accumulatedSeconds = 0;
  #destroyed = false;

  readonly #onBeginContact = (contact: Contact): void => {
    this.#updateSensorContact(contact, 1);
  };

  readonly #onEndContact = (contact: Contact): void => {
    this.#updateSensorContact(contact, -1);
  };

  /**
   * A running belt is a surface speed: Box2D's tangent speed drives what
   * touches it without moving the static frame. The solver aims the
   * velocity of B relative to A, along the tangent (normal.y, -normal.x), at
   * that speed; only the belt's horizontal component is kept, so the frame's
   * ends and underside do not drive anything.
   */
  readonly #onPreSolve = (contact: Contact): void => {
    const onA = this.#conveyorFixtures.get(contact.getFixtureA());
    const conveyor = onA ?? this.#conveyorFixtures.get(contact.getFixtureB());
    if (conveyor === undefined || conveyor.direction === 0) return;

    const normal = contact.getWorldManifold(null)?.normal;
    if (normal === undefined) return;
    const belt = conveyor.direction * CONVEYOR_SPEED;
    contact.setTangentSpeed((onA === undefined ? -1 : 1) * belt * normal.y);
  };

  constructor(level: LevelDocument, fixedStepSeconds: number, attemptTimeoutSeconds: number) {
    this.#level = structuredClone(level);
    this.#fixedStepSeconds = fixedStepSeconds;
    this.#goalRule = {
      ballId: this.#level.goal.ballId,
      basketId: this.#level.goal.basketId,
      holdDurationInFixedSteps: BASKET_GOAL_HOLD_DURATION_IN_FIXED_STEPS,
    };
    // The budget crosses into the domain as a step count: seconds stop here.
    const timeoutInFixedSteps = Math.round(attemptTimeoutSeconds / fixedStepSeconds);
    assertPositiveSafeInteger(timeoutInFixedSteps, 'La limite de temps en pas fixes');
    this.#failureRule = {
      ballId: this.#level.goal.ballId,
      scene: this.#level.scene,
      outOfSceneMarginInWorldUnits: OUT_OF_SCENE_MARGIN_IN_WORLD_UNITS,
      timeoutInFixedSteps,
    };
    this.#buildWorld();
  }

  readState(): SimulationSnapshot {
    return {
      fixedStep: this.#fixedStep,
      fixedStepSeconds: this.#fixedStepSeconds,
      bodies: this.#bodies.map(({ placementId, role, handle }) => {
        const position = handle.getPosition();
        const velocity = handle.getLinearVelocity();
        return {
          placementId,
          role,
          bodyType: bodyType(handle),
          position: { x: position.x, y: position.y },
          rotation: handle.getAngle(),
          linearVelocity: { x: velocity.x, y: velocity.y },
          angularVelocity: handle.getAngularVelocity(),
        };
      }),
      joints: this.#joints.map(({ placementId, handle, moving }) => {
        const anchor = handle.getAnchorA();
        return {
          placementId,
          type: 'revolute',
          bodyARole: 'base',
          bodyBRole: moving,
          anchor: { x: anchor.x, y: anchor.y },
        };
      }),
      events: this.#events.map((event) => ({ ...event })),
      devices: [
        ...this.#levers.map(
          (lever): SimulationDeviceState => ({
            placementId: lever.placementId,
            kind: 'lever',
            position: this.#leverPosition(lever),
          }),
        ),
        ...this.#conveyors.map(
          ({ placementId, direction, facing, beltOffset }): SimulationDeviceState => ({
            placementId,
            kind: 'conveyor',
            direction,
            facing,
            beltOffset,
          }),
        ),
      ],
    };
  }

  readResources(): SimulationResources {
    const world = this.#world;
    if (world === null) {
      return { bodies: 0, colliders: 0, joints: 0, sensors: 0 };
    }

    let colliders = 0;
    let sensors = 0;
    for (let body = world.getBodyList(); body !== null; body = body.getNext()) {
      for (let fixture = body.getFixtureList(); fixture !== null; fixture = fixture.getNext()) {
        colliders += 1;
        if (fixture.isSensor()) sensors += 1;
      }
    }

    return {
      bodies: world.getBodyCount(),
      colliders,
      joints: world.getJointCount(),
      sensors,
    };
  }

  readGoalEvaluation(): BasketGoalEvaluation {
    return { ...this.#goalEvaluation };
  }

  readFailureEvaluation(): AttemptFailureEvaluation {
    return { ...this.#failureEvaluation };
  }

  advanceFixedSteps(count: number): void {
    assertNonNegativeSafeInteger(count, 'Le nombre de pas fixes');
    if (this.#destroyed || count === 0) return;
    assertNonNegativeSafeInteger(this.#fixedStep + count, 'Le numéro de pas fixe résultant');

    for (let index = 0; index < count; index += 1) {
      this.#step();
    }
  }

  advanceElapsedSeconds(elapsedSeconds: number): number {
    assertNonNegativeFinite(elapsedSeconds, 'La durée écoulée');
    if (this.#destroyed || elapsedSeconds === 0) return 0;

    this.#accumulatedSeconds += elapsedSeconds;
    if (!Number.isFinite(this.#accumulatedSeconds)) {
      throw new RangeError('La durée accumulée doit rester finie.');
    }

    const steps = Math.floor(
      (this.#accumulatedSeconds + Number.EPSILON * this.#fixedStepSeconds) / this.#fixedStepSeconds,
    );
    assertNonNegativeSafeInteger(steps, 'Le nombre de pas fixes accumulés');
    this.advanceFixedSteps(steps);
    this.#accumulatedSeconds -= steps * this.#fixedStepSeconds;
    if (Math.abs(this.#accumulatedSeconds) < Number.EPSILON * this.#fixedStepSeconds) {
      this.#accumulatedSeconds = 0;
    }
    return steps;
  }

  reset(): void {
    if (this.#destroyed) return;
    this.#releaseWorld();
    this.#fixedStep = 0;
    this.#accumulatedSeconds = 0;
    this.#events = [];
    this.#goalEvaluation = resetBasketGoalEvaluation();
    this.#failureEvaluation = resetAttemptFailureEvaluation();
    this.#buildWorld();
  }

  destroy(): boolean {
    if (this.#destroyed) return false;
    this.#releaseWorld();
    this.#destroyed = true;
    this.#events = [];
    return true;
  }

  #buildWorld(): void {
    const world = createPhysicsWorld();
    this.#world = world;
    world.on('begin-contact', this.#onBeginContact);
    world.on('end-contact', this.#onEndContact);
    world.on('pre-solve', this.#onPreSolve);

    for (const placement of this.#level.objects) {
      switch (placement.type) {
        case 'ball':
          this.#createBall(
            placement.id,
            placement.transform.position,
            placement.transform.rotation,
          );
          break;
        case 'basket':
          this.#createBasket(
            placement.id,
            placement.transform.position,
            placement.transform.rotation,
          );
          break;
        case 'beam':
          this.#createBeam(
            placement.id,
            placement.transform.position,
            placement.transform.rotation,
            placement.props.size,
          );
          break;
        case 'seesaw':
          this.#createSeesaw(
            placement.id,
            placement.transform.position,
            placement.transform.rotation,
          );
          break;
        case 'mass':
          this.#createMass(
            placement.id,
            placement.transform.position,
            placement.transform.rotation,
            MASS_KILOGRAMS[placement.props.weight],
          );
          break;
        case 'lever':
          this.#createLever(
            placement.id,
            placement.transform.position,
            placement.transform.rotation,
            placement.props.position,
          );
          break;
        case 'conveyor':
          this.#createConveyor(
            placement.id,
            placement.transform.position,
            placement.transform.rotation,
            conveyorDirections[placement.props.direction],
          );
          break;
      }
    }
    this.#commandConveyors();
  }

  /** Brakes each ball's spin while it rests on a surface, never past a standstill. */
  #applyRollingResistance(): void {
    for (const ball of this.#balls) {
      const spin = ball.getAngularVelocity();
      if (spin === 0 || !this.#isTouchingSomething(ball)) continue;

      const available = ROLLING_RESISTANCE_COEFFICIENT * ball.getMass() * GRAVITY * BALL_RADIUS;
      const stopping = (ball.getInertia() * Math.abs(spin)) / this.#fixedStepSeconds;
      ball.applyTorque(-Math.sign(spin) * Math.min(available, stopping), false);
    }
  }

  #isTouchingSomething(body: Body): boolean {
    for (let edge = body.getContactList(); edge !== null; edge = edge.next ?? null) {
      if (
        edge.contact.isTouching() &&
        !edge.contact.getFixtureA().isSensor() &&
        !edge.contact.getFixtureB().isSensor()
      ) {
        return true;
      }
    }
    return false;
  }

  #createBall(placementId: string, position: SimulationVector, rotation: number): void {
    const body = this.#requireWorld().createBody({
      type: 'dynamic',
      position: new Vec2(position.x, position.y),
      angle: rotation,
      // The ball is the only fast body of the game: continuous collision keeps
      // it from tunnelling through a 0,25 unit beam or a 0,24 unit seesaw board.
      bullet: true,
      allowSleep: true,
    });
    this.#bodies.push({ placementId, role: 'primary', handle: body });
    this.#balls.push(body);
    this.#createFixture(body, {
      shape: new Circle(BALL_RADIUS),
      density: 1,
      friction: 0.35,
      restitution: 0.25,
    });
  }

  #createBasket(placementId: string, position: SimulationVector, rotation: number): void {
    const body = this.#requireWorld().createBody({
      type: 'static',
      position: new Vec2(position.x, position.y),
      angle: rotation,
    });
    this.#bodies.push({ placementId, role: 'primary', handle: body });

    // Floor at the bottom, walls rising on both sides, mouth open upwards:
    // in a `y`-down world the floor offset is positive.
    this.#createFixture(body, {
      shape: new Box(
        BASKET_HALF_WIDTH,
        BASKET_WALL_HALF_THICKNESS,
        new Vec2(0, BASKET_FLOOR_OFFSET_Y),
        0,
      ),
      friction: 0.4,
    });
    this.#createFixture(body, {
      shape: new Box(
        BASKET_WALL_HALF_THICKNESS,
        BASKET_WALL_HALF_HEIGHT,
        new Vec2(-BASKET_WALL_OFFSET_X, 0),
        0,
      ),
      friction: 0.4,
    });
    this.#createFixture(body, {
      shape: new Box(
        BASKET_WALL_HALF_THICKNESS,
        BASKET_WALL_HALF_HEIGHT,
        new Vec2(BASKET_WALL_OFFSET_X, 0),
        0,
      ),
      friction: 0.4,
    });
    const sensor = this.#createFixture(body, {
      shape: new Box(BASKET_HALF_WIDTH, BASKET_SENSOR_HALF_HEIGHT),
      isSensor: true,
    });
    this.#sensors.set(sensor, { targetId: placementId });
  }

  #createBeam(
    placementId: string,
    position: SimulationVector,
    rotation: number,
    size: keyof typeof beamGeometry.footprints,
  ): void {
    const body = this.#requireWorld().createBody({
      type: 'static',
      position: new Vec2(position.x, position.y),
      angle: rotation,
    });
    this.#bodies.push({ placementId, role: 'primary', handle: body });
    this.#createFixture(body, {
      shape: new Box(beamGeometry.footprints[size].width / 2, BEAM_HALF_THICKNESS),
      friction: 0.45,
    });
  }

  #createMass(
    placementId: string,
    position: SimulationVector,
    rotation: number,
    kilograms: number,
  ): void {
    const body = this.#requireWorld().createBody({
      type: 'dynamic',
      position: new Vec2(position.x, position.y),
      angle: rotation,
      allowSleep: true,
    });
    this.#bodies.push({ placementId, role: 'primary', handle: body });
    this.#createFixture(body, {
      shape: new Polygon(MASS_VERTICES),
      density: kilograms / MASS_AREA,
      friction: 0.6,
      restitution: 0.05,
    });
  }

  #createLever(
    placementId: string,
    position: SimulationVector,
    rotation: number,
    startPosition: LeverPosition,
  ): void {
    const world = this.#requireWorld();
    const pivot = new Vec2(position.x, position.y);
    const base = world.createBody({ type: 'static', position: pivot, angle: rotation });
    // The handle's origin is the pivot too, so its angle is the lever's
    // reading. It is created upright: the joint measures its limits from the
    // angle the bodies have when it is made, and they must frame the vertical.
    const handle = world.createBody({
      type: 'dynamic',
      position: pivot,
      angle: rotation,
      allowSleep: true,
    });
    this.#bodies.push(
      { placementId, role: 'base', handle: base },
      { placementId, role: 'handle', handle },
    );
    this.#createFixture(base, { shape: new Polygon(LEVER_BASE_VERTICES), friction: 0.5 });

    const { stickHalfWidth, knobCenterY, knobRadius } = leverGeometry.handle;
    this.#createFixture(handle, {
      shape: new Box(stickHalfWidth, -knobCenterY / 2, new Vec2(0, knobCenterY / 2), 0),
      density: 1,
      friction: 0.4,
    });
    this.#createFixture(handle, {
      shape: new Circle(new Vec2(0, knobCenterY), knobRadius),
      density: 1,
      friction: 0.4,
    });

    const joint = world.createJoint(
      new RevoluteJoint(
        {
          enableLimit: true,
          lowerAngle: -leverGeometry.tilt,
          upperAngle: leverGeometry.tilt,
          enableMotor: true,
          motorSpeed: 0,
          maxMotorTorque: LEVER_NOTCH_TORQUE,
          collideConnected: false,
        },
        base,
        handle,
        pivot,
      ),
    );
    if (joint === null) {
      throw new Error(`Impossible de créer le pivot du levier « ${placementId} ».`);
    }
    handle.setTransform(pivot, rotation + leverAngle(startPosition));
    this.#joints.push({ placementId, handle: joint, moving: 'handle' });
    this.#levers.push({ placementId, base, handle, joint });
  }

  #createConveyor(
    placementId: string,
    position: SimulationVector,
    rotation: number,
    ownDirection: ConveyorDirection,
  ): void {
    const body = this.#requireWorld().createBody({
      type: 'static',
      position: new Vec2(position.x, position.y),
      angle: rotation,
    });
    this.#bodies.push({ placementId, role: 'primary', handle: body });
    const { width, height } = conveyorGeometry.footprint;
    const fixture = this.#createFixture(body, {
      shape: new Box(width / 2, height / 2),
      friction: 0.8,
    });
    const record: ConveyorRecord = {
      placementId,
      body,
      ownDirection,
      leverId: this.#level.wires.find(({ targetId }) => targetId === placementId)?.sourceId,
      direction: ownDirection,
      facing: ownDirection === -1 ? -1 : 1,
      beltOffset: 0,
    };
    this.#conveyors.push(record);
    this.#conveyorFixtures.set(fixture, record);
  }

  #leverPosition({ base, handle }: LeverRecord): LeverPosition {
    return leverPositionFromAngle(handle.getAngle() - base.getAngle());
  }

  /** Aims each lever's motor at its nearest notch before the step. */
  #pullLeversToNotches(): void {
    for (const lever of this.#levers) {
      const angle = lever.handle.getAngle() - lever.base.getAngle();
      const notch = leverAngle(leverPositionFromAngle(angle));
      lever.joint.setMotorSpeed((notch - angle) * LEVER_NOTCH_STIFFNESS);
    }
  }

  /** Reads every lever and sets the direction of the conveyors it commands. */
  #commandConveyors(): void {
    for (const conveyor of this.#conveyors) {
      const lever =
        conveyor.leverId === undefined
          ? undefined
          : this.#levers.find(({ placementId }) => placementId === conveyor.leverId);
      const direction =
        lever === undefined
          ? conveyor.ownDirection
          : conveyorDirections[
              ({ left: 'left', center: 'stopped', right: 'right' } as const)[
                this.#leverPosition(lever)
              ]
            ];
      conveyor.direction = direction;
      if (direction !== 0) {
        conveyor.facing = direction;
        this.#wakeBodiesOn(conveyor.body);
      }
    }
  }

  /** A body asleep on a stopped belt would otherwise ignore it starting. */
  #wakeBodiesOn(body: Body): void {
    for (let edge = body.getContactList(); edge !== null; edge = edge.next ?? null) {
      edge.other?.setAwake(true);
    }
  }

  #createSeesaw(placementId: string, position: SimulationVector, rotation: number): void {
    const world = this.#requireWorld();
    const base = world.createBody({
      type: 'static',
      position: new Vec2(position.x, position.y),
      angle: rotation,
    });
    const board = world.createBody({
      type: 'dynamic',
      position: new Vec2(position.x, position.y),
      angle: rotation,
    });
    this.#bodies.push(
      { placementId, role: 'base', handle: base },
      { placementId, role: 'board', handle: board },
    );
    this.#createFixture(base, {
      shape: new Polygon(SEESAW_FULCRUM_VERTICES),
      friction: 0.5,
    });
    this.#createFixture(board, {
      shape: new Box(seesawGeometry.board.halfLength, seesawGeometry.board.halfThickness),
      density: 1,
      friction: 0.4,
    });

    const anchor = new Vec2(position.x, position.y);
    const joint = world.createJoint(
      new RevoluteJoint(
        {
          enableLimit: true,
          lowerAngle: -SEESAW_ANGLE_LIMIT,
          upperAngle: SEESAW_ANGLE_LIMIT,
          collideConnected: false,
        },
        base,
        board,
        anchor,
      ),
    );
    if (joint === null) {
      throw new Error(`Impossible de créer le pivot de la bascule « ${placementId} ».`);
    }
    this.#joints.push({ placementId, handle: joint, moving: 'board' });
  }

  #createFixture(body: Body, definition: FixtureDef): Fixture {
    const fixture = body.createFixture(definition);
    this.#colliders.add(fixture);
    return fixture;
  }

  #step(): void {
    const world = this.#requireWorld();
    this.#fixedStep += 1;
    this.#events = [];
    this.#pullLeversToNotches();
    this.#applyRollingResistance();
    world.step(this.#fixedStepSeconds);
    for (const conveyor of this.#conveyors) {
      conveyor.beltOffset += conveyor.direction * CONVEYOR_SPEED * this.#fixedStepSeconds;
    }
    this.#commandConveyors();
    this.#goalEvaluation = applyBasketGoalFacts(this.#goalEvaluation, this.#goalRule, this.#events);
    this.#goalEvaluation = advanceBasketGoalEvaluation(
      this.#goalEvaluation,
      this.#goalRule,
      this.#fixedStep,
    );
    this.#failureEvaluation = applyAttemptFailureFacts(
      this.#failureEvaluation,
      this.#failureRule,
      this.#readTargetBallPositionFacts(),
    );
    this.#failureEvaluation = advanceAttemptFailureEvaluation(
      this.#failureEvaluation,
      this.#failureRule,
      this.#fixedStep,
    );
  }

  /**
   * The target ball's position after the step, turned into the ordered fact
   * the domain evaluator consumes. A step produces at most one such fact, so
   * its order is always zero.
   */
  #readTargetBallPositionFacts(): readonly BallPositionFact[] {
    const ball = this.#bodies.find(
      (record) => record.placementId === this.#failureRule.ballId && record.role === 'primary',
    );
    if (ball === undefined) return [];

    const position = ball.handle.getPosition();
    return [
      {
        placementId: ball.placementId,
        position: { x: position.x, y: position.y },
        fixedStep: this.#fixedStep,
        order: 0,
      },
    ];
  }

  #updateSensorContact(contact: Contact, delta: 1 | -1): void {
    const fixtureA = contact.getFixtureA();
    const fixtureB = contact.getFixtureB();
    const sensorA = this.#sensors.get(fixtureA);
    const sensorB = this.#sensors.get(fixtureB);

    if (sensorA !== undefined) {
      this.#updateSensorPair(sensorA, fixtureB.getBody(), delta);
    }
    if (sensorB !== undefined) {
      this.#updateSensorPair(sensorB, fixtureA.getBody(), delta);
    }
  }

  #updateSensorPair(sensor: SensorRecord, body: Body, delta: 1 | -1): void {
    const other = this.#bodies.find((record) => record.handle === body);
    if (other === undefined || other.placementId === sensor.targetId) return;

    const key = `${other.placementId}\u0000${sensor.targetId}`;
    const previousCount = this.#activeSensorContacts.get(key) ?? 0;
    const nextCount = Math.max(0, previousCount + delta);

    if (nextCount === 0) {
      this.#activeSensorContacts.delete(key);
    } else {
      this.#activeSensorContacts.set(key, nextCount);
    }

    if (delta === 1 && previousCount === 0) {
      this.#events.push({
        type: 'object-entered-sensor',
        placementId: other.placementId,
        targetId: sensor.targetId,
        fixedStep: this.#fixedStep,
        order: this.#events.length,
      });
    } else if (delta === -1 && previousCount > 0 && nextCount === 0) {
      this.#events.push({
        type: 'object-left-sensor',
        placementId: other.placementId,
        targetId: sensor.targetId,
        fixedStep: this.#fixedStep,
        order: this.#events.length,
      });
    }
  }

  #releaseWorld(): void {
    const world = this.#world;
    if (world === null) return;

    world.off('begin-contact', this.#onBeginContact);
    world.off('end-contact', this.#onEndContact);
    world.off('pre-solve', this.#onPreSolve);
    for (const { handle } of [...this.#joints].reverse()) {
      world.destroyJoint(handle);
    }
    for (const { handle } of [...this.#bodies].reverse()) {
      world.destroyBody(handle);
    }

    this.#world = null;
    this.#bodies = [];
    this.#colliders.clear();
    this.#joints = [];
    this.#balls = [];
    this.#levers = [];
    this.#conveyors = [];
    this.#conveyorFixtures.clear();
    this.#sensors.clear();
    this.#activeSensorContacts.clear();
  }

  #requireWorld(): ReturnType<typeof createPhysicsWorld> {
    if (this.#world === null) {
      throw new Error('La session de simulation est détruite.');
    }
    return this.#world;
  }
}

export const createSimulationSession = (
  level: LevelDocument,
  options: SimulationSessionOptions,
): SimulationSession => {
  assertPositiveFinite(options.fixedStepSeconds, 'Le pas fixe');
  const attemptTimeoutSeconds = options.attemptTimeoutSeconds ?? DEFAULT_ATTEMPT_TIMEOUT_SECONDS;
  assertPositiveFinite(attemptTimeoutSeconds, 'La durée maximale d’une tentative');
  return new PlanckSimulationSession(level, options.fixedStepSeconds, attemptTimeoutSeconds);
};

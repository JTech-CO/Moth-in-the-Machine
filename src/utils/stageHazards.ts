import {
  distance3D,
  intersectsAabb,
  intersectsSphereAabb,
  isLandingSuccessful,
  LANDING_MAX_DISTANCE,
  magnitude3D,
  measureLandingSurfaceContact,
  type Aabb,
  type LandingContactLimits,
  type LandingMotionSegment,
  type Vec3,
} from '@/utils/collision';
import type { ObstacleDefinition } from '@/utils/stages';

export interface HazardRuntimeState {
  readonly activeContactIds: ReadonlySet<string>;
  readonly spentOneShotIds: ReadonlySet<string>;
  readonly contactRemainderSecondsById: ReadonlyMap<string, number>;
}

export interface StageHazardEvent {
  readonly obstacleId: string;
  readonly type: ObstacleDefinition['type'];
  readonly damage: number;
}

export interface StageHazardEvaluation {
  readonly damage: number;
  readonly events: readonly StageHazardEvent[];
  readonly blockingObstacleIds: readonly string[];
  readonly runtime: HazardRuntimeState;
}

export type LandingAttemptResult = 'none' | 'success' | 'failure';
export type TargetSurface = 'floor' | 'ceiling' | 'left-wall' | 'right-wall';

export interface LandingTargetContract {
  readonly position: Vec3;
  readonly surface: TargetSurface;
  /** Canonical inward normal for the named surface. */
  readonly normal: Vec3;
}

const TARGET_SURFACE_NORMALS: Readonly<Record<TargetSurface, Vec3>> = Object.freeze({
  floor: Object.freeze({ x: 0, y: 1, z: 0 }),
  ceiling: Object.freeze({ x: 0, y: -1, z: 0 }),
  'left-wall': Object.freeze({ x: 1, y: 0, z: 0 }),
  'right-wall': Object.freeze({ x: -1, y: 0, z: 0 }),
});

export const CONTACT_DAMAGE_TICK_SECONDS = 1 / 60;
const CONTACT_TICK_EPSILON = CONTACT_DAMAGE_TICK_SECONDS * 1e-9;

function assertFiniteNumber(value: number, label: string): void {
  if (!Number.isFinite(value)) {
    throw new RangeError(`${label} must be finite.`);
  }
}

function assertNonNegative(value: number, label: string): void {
  assertFiniteNumber(value, label);

  if (value < 0) {
    throw new RangeError(`${label} must be non-negative.`);
  }
}

function assertVec3(vector: Vec3, label: string): void {
  assertFiniteNumber(vector.x, `${label}.x`);
  assertFiniteNumber(vector.y, `${label}.y`);
  assertFiniteNumber(vector.z, `${label}.z`);
}

function assertLandingAttemptResult(result: LandingAttemptResult, label: string): void {
  if (result !== 'none' && result !== 'success' && result !== 'failure') {
    throw new TypeError(`${label} must be none, success, or failure.`);
  }
}

function assertLandingTargetContract(target: LandingTargetContract): void {
  const expectedNormal = TARGET_SURFACE_NORMALS[target.surface];

  if (expectedNormal === undefined) {
    throw new TypeError('target.surface is not supported.');
  }

  assertVec3(target.position, 'target.position');
  assertVec3(target.normal, 'target.normal');

  if (
    target.normal.x !== expectedNormal.x ||
    target.normal.y !== expectedNormal.y ||
    target.normal.z !== expectedNormal.z
  ) {
    throw new RangeError(`target.normal does not match ${target.surface}.`);
  }
}

function cloneIdSet(ids: ReadonlySet<string>, label: string): Set<string> {
  let clone: Set<string>;

  try {
    clone = new Set(ids);
  } catch {
    throw new TypeError(`${label} must be a set of obstacle IDs.`);
  }

  for (const id of clone) {
    if (typeof id !== 'string' || id.trim().length === 0) {
      throw new TypeError(`${label} must contain non-empty string obstacle IDs.`);
    }
  }

  return clone;
}

function cloneContactRemainders(
  remainders: ReadonlyMap<string, number>,
  activeContactIds: ReadonlySet<string>,
): Map<string, number> {
  let clone: Map<string, number>;

  try {
    clone = new Map(remainders);
  } catch {
    throw new TypeError('contactRemainderSecondsById must be a map.');
  }

  for (const [id, remainder] of clone) {
    if (typeof id !== 'string' || id.trim().length === 0) {
      throw new TypeError('contactRemainderSecondsById keys must be non-empty obstacle IDs.');
    }

    assertNonNegative(remainder, `contact remainder for ${id}`);

    if (remainder >= CONTACT_DAMAGE_TICK_SECONDS) {
      throw new RangeError(`contact remainder for ${id} must be less than one contact tick.`);
    }

    if (!activeContactIds.has(id)) {
      throw new RangeError(`contact remainder for ${id} requires an active contact.`);
    }
  }

  return clone;
}

function createPlayerAabb(position: Vec3, halfExtents: Vec3): Aabb {
  assertVec3(position, 'playerPosition');
  assertVec3(halfExtents, 'playerHalfExtents');
  assertNonNegative(halfExtents.x, 'playerHalfExtents.x');
  assertNonNegative(halfExtents.y, 'playerHalfExtents.y');
  assertNonNegative(halfExtents.z, 'playerHalfExtents.z');

  const playerAabb: Aabb = {
    min: {
      x: position.x - halfExtents.x,
      y: position.y - halfExtents.y,
      z: position.z - halfExtents.z,
    },
    max: {
      x: position.x + halfExtents.x,
      y: position.y + halfExtents.y,
      z: position.z + halfExtents.z,
    },
  };

  assertVec3(playerAabb.min, 'playerAabb.min');
  assertVec3(playerAabb.max, 'playerAabb.max');

  return playerAabb;
}

function assertObstacleIdentity(obstacle: ObstacleDefinition, seenIds: Set<string>): void {
  if (typeof obstacle.id !== 'string' || obstacle.id.trim().length === 0) {
    throw new TypeError('Obstacle IDs must be non-empty strings.');
  }

  if (seenIds.has(obstacle.id)) {
    throw new RangeError(`Obstacle ID ${obstacle.id} is duplicated.`);
  }

  seenIds.add(obstacle.id);
}

function assertDamage(damage: number, label: string): void {
  assertNonNegative(damage, label);
}

function addDamageEvent(
  events: StageHazardEvent[],
  obstacle: ObstacleDefinition,
  damage: number,
): void {
  assertDamage(damage, `${obstacle.id}.damage`);

  if (damage === 0) {
    return;
  }

  events.push(
    Object.freeze({
      obstacleId: obstacle.id,
      type: obstacle.type,
      damage,
    }),
  );
}

function evaluateContactDamage(
  obstacle: Extract<ObstacleDefinition, { readonly type: 'wire' | 'spark' }>,
  deltaSeconds: number,
  wasTouching: boolean,
  previousRemainders: ReadonlyMap<string, number>,
  nextRemainders: Map<string, number>,
): number {
  if (!wasTouching) {
    // Collision is observed at the end of this step, so contact time starts here.
    nextRemainders.set(obstacle.id, 0);
    return obstacle.damage;
  }

  const accumulatedSeconds = (previousRemainders.get(obstacle.id) ?? 0) + deltaSeconds;
  assertFiniteNumber(accumulatedSeconds, `${obstacle.id} accumulated contact time`);

  const tickCount = Math.floor(
    (accumulatedSeconds + CONTACT_TICK_EPSILON) / CONTACT_DAMAGE_TICK_SECONDS,
  );
  assertFiniteNumber(tickCount, `${obstacle.id} contact tick count`);

  let remainderSeconds = accumulatedSeconds - tickCount * CONTACT_DAMAGE_TICK_SECONDS;

  if (remainderSeconds < 0 && remainderSeconds >= -CONTACT_TICK_EPSILON) {
    remainderSeconds = 0;
  }

  assertNonNegative(remainderSeconds, `${obstacle.id} contact remainder`);

  if (remainderSeconds >= CONTACT_DAMAGE_TICK_SECONDS) {
    throw new RangeError(`${obstacle.id} contact remainder must be less than one contact tick.`);
  }

  nextRemainders.set(obstacle.id, remainderSeconds);

  const damage = obstacle.damage * tickCount;
  assertFiniteNumber(damage, `${obstacle.id} contact damage`);

  return damage;
}

function evaluateOverheatedRelayDamage(
  obstacle: Extract<ObstacleDefinition, { readonly type: 'overheated-relay' }>,
  playerPosition: Vec3,
  deltaSeconds: number,
): number {
  assertVec3(obstacle.center, `${obstacle.id}.center`);
  assertNonNegative(obstacle.coreRadius, `${obstacle.id}.coreRadius`);
  assertNonNegative(obstacle.range, `${obstacle.id}.range`);
  assertNonNegative(obstacle.minDamagePerSecond, `${obstacle.id}.minDamagePerSecond`);
  assertNonNegative(obstacle.maxDamagePerSecond, `${obstacle.id}.maxDamagePerSecond`);

  if (obstacle.range <= obstacle.coreRadius) {
    throw new RangeError(`${obstacle.id}.range must exceed its coreRadius.`);
  }

  if (obstacle.maxDamagePerSecond < obstacle.minDamagePerSecond) {
    throw new RangeError(
      `${obstacle.id}.maxDamagePerSecond must not be less than its minDamagePerSecond.`,
    );
  }

  const distance = distance3D(playerPosition, obstacle.center);

  if (distance > obstacle.range) {
    return 0;
  }

  let damagePerSecond = obstacle.maxDamagePerSecond;

  if (distance > obstacle.coreRadius) {
    const falloffProgress =
      (distance - obstacle.coreRadius) / (obstacle.range - obstacle.coreRadius);
    damagePerSecond =
      obstacle.maxDamagePerSecond -
      (obstacle.maxDamagePerSecond - obstacle.minDamagePerSecond) * falloffProgress;
  }

  const damage = damagePerSecond * deltaSeconds;
  assertFiniteNumber(damage, `${obstacle.id} heat damage`);

  return damage;
}

function assertNeverObstacle(obstacle: never): never {
  throw new RangeError(`Unknown obstacle type: ${String((obstacle as { type?: unknown }).type)}`);
}

export function createHazardRuntimeState(): HazardRuntimeState {
  return {
    activeContactIds: new Set<string>(),
    spentOneShotIds: new Set<string>(),
    contactRemainderSecondsById: new Map<string, number>(),
  };
}

export function evaluateStageHazards(
  obstacles: readonly ObstacleDefinition[],
  playerPosition: Vec3,
  playerHalfExtents: Vec3,
  deltaSeconds: number,
  runtime: HazardRuntimeState,
): StageHazardEvaluation {
  assertNonNegative(deltaSeconds, 'deltaSeconds');

  const playerAabb = createPlayerAabb(playerPosition, playerHalfExtents);
  const previousActiveContactIds = cloneIdSet(runtime.activeContactIds, 'activeContactIds');
  const spentOneShotIds = cloneIdSet(runtime.spentOneShotIds, 'spentOneShotIds');
  const previousContactRemainders = cloneContactRemainders(
    runtime.contactRemainderSecondsById,
    previousActiveContactIds,
  );
  const activeContactIds = new Set<string>();
  const contactRemainderSecondsById = new Map<string, number>();
  const blockingObstacleIds: string[] = [];
  const events: StageHazardEvent[] = [];
  const seenObstacleIds = new Set<string>();

  for (const obstacle of obstacles) {
    assertObstacleIdentity(obstacle, seenObstacleIds);

    switch (obstacle.type) {
      case 'wire': {
        assertDamage(obstacle.damage, `${obstacle.id}.damage`);
        const isTouching = intersectsAabb(playerAabb, obstacle.collider);

        if (isTouching) {
          activeContactIds.add(obstacle.id);
          blockingObstacleIds.push(obstacle.id);
          addDamageEvent(
            events,
            obstacle,
            evaluateContactDamage(
              obstacle,
              deltaSeconds,
              previousActiveContactIds.has(obstacle.id),
              previousContactRemainders,
              contactRemainderSecondsById,
            ),
          );
        }
        break;
      }

      case 'spark': {
        assertDamage(obstacle.damage, `${obstacle.id}.damage`);
        const isTouching = intersectsSphereAabb(obstacle.collider, playerAabb);

        if (isTouching) {
          activeContactIds.add(obstacle.id);
          blockingObstacleIds.push(obstacle.id);
          addDamageEvent(
            events,
            obstacle,
            evaluateContactDamage(
              obstacle,
              deltaSeconds,
              previousActiveContactIds.has(obstacle.id),
              previousContactRemainders,
              contactRemainderSecondsById,
            ),
          );
        }
        break;
      }

      case 'overheated-relay':
        addDamageEvent(
          events,
          obstacle,
          evaluateOverheatedRelayDamage(obstacle, playerPosition, deltaSeconds),
        );
        break;

      case 'vacuum-tube': {
        assertDamage(obstacle.damage, `${obstacle.id}.damage`);
        const isTouching = intersectsSphereAabb(obstacle.collider, playerAabb);

        if (isTouching && !spentOneShotIds.has(obstacle.id)) {
          spentOneShotIds.add(obstacle.id);
          addDamageEvent(events, obstacle, obstacle.damage);
        }
        break;
      }

      default:
        assertNeverObstacle(obstacle);
    }
  }

  const damage = events.reduce((total, event) => total + event.damage, 0);
  assertFiniteNumber(damage, 'total hazard damage');

  return {
    damage,
    events: Object.freeze(events),
    blockingObstacleIds: Object.freeze(blockingObstacleIds),
    runtime: {
      activeContactIds,
      spentOneShotIds,
      contactRemainderSecondsById,
    },
  };
}

export function evaluateLandingAttempt(
  mode: 'hover' | 'landing-ready',
  position: Vec3,
  velocity: Vec3,
  target: Vec3,
  floorY: number,
): LandingAttemptResult {
  assertVec3(position, 'position');
  assertVec3(velocity, 'velocity');
  assertVec3(target, 'target');
  assertFiniteNumber(floorY, 'floorY');

  if (mode !== 'hover' && mode !== 'landing-ready') {
    throw new TypeError('mode must be hover or landing-ready.');
  }

  // Validate derived magnitudes even when the current mode cannot complete a landing.
  const landingDistance = distance3D(position, target);
  magnitude3D(velocity);

  if (mode === 'hover' || position.y > floorY) {
    return 'none';
  }

  if (landingDistance > LANDING_MAX_DISTANCE) {
    return 'failure';
  }

  // A valid pad contact may still carry a few frames of horizontal inertia.
  // Keep simulating so drag can settle it instead of latching an immediate false failure.
  return isLandingSuccessful(position, target, velocity) ? 'success' : 'none';
}
/**
 * Evaluates contact before collision response. Once this returns success, callers
 * must latch it before applying a wall/floor bounce.
 */
export function evaluateSurfaceLandingAttempt(
  mode: 'hover' | 'landing-ready',
  motion: LandingMotionSegment,
  target: LandingTargetContract,
  limits: LandingContactLimits = {},
): LandingAttemptResult {
  if (mode !== 'hover' && mode !== 'landing-ready') {
    throw new TypeError('mode must be hover or landing-ready.');
  }

  assertLandingTargetContract(target);
  const contact = measureLandingSurfaceContact(motion, target, limits);

  if (mode === 'hover' || !contact.contacted || !contact.approaching) {
    return 'none';
  }

  if (!contact.insideRadius || !contact.safeApproach) {
    return 'failure';
  }

  return 'success';
}

/** Keeps the first terminal result irreversible across later physics samples. */
export function latchLandingAttempt(
  current: LandingAttemptResult,
  next: LandingAttemptResult,
): LandingAttemptResult {
  assertLandingAttemptResult(current, 'current landing attempt');
  assertLandingAttemptResult(next, 'next landing attempt');

  return current === 'none' ? next : current;
}

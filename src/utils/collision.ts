export interface Vec3 {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export interface Aabb {
  readonly min: Vec3;
  readonly max: Vec3;
}

export interface Sphere {
  readonly center: Vec3;
  readonly radius: number;
}

export const LANDING_MAX_DISTANCE = 0.5;
export const LANDING_STOP_SPEED = 0.1;
export const LANDING_PLANE_TOLERANCE = 0.02;
export const LANDING_MAX_NORMAL_SPEED = 2;
const LANDING_APPROACH_EPSILON = 1e-9;

export interface LandingSurfaceTarget {
  readonly position: Vec3;
  /** Unit normal pointing from the surface into the playable volume. */
  readonly normal: Vec3;
}

export interface LandingMotionSegment {
  readonly previousPosition: Vec3;
  readonly position: Vec3;
  /** Velocity immediately before any collision response or bounce. */
  readonly approachVelocity: Vec3;
}

export interface LandingContactLimits {
  readonly radius?: number;
  readonly planeTolerance?: number;
  readonly maxNormalSpeed?: number;
}

export interface LandingContactMeasurement {
  readonly previousNormalDistance: number;
  readonly normalDistance: number;
  readonly radialDistance: number;
  readonly normalVelocity: number;
  readonly normalSpeed: number;
  readonly contacted: boolean;
  readonly approaching: boolean;
  readonly insideRadius: boolean;
  readonly safeApproach: boolean;
}

function assertFiniteNumber(value: number, label: string): void {
  if (!Number.isFinite(value)) {
    throw new RangeError(label + ' must be finite.');
  }
}

function assertNonNegative(value: number, label: string): void {
  assertFiniteNumber(value, label);

  if (value < 0) {
    throw new RangeError(label + ' must be non-negative.');
  }
}

function assertVec3(vector: Vec3, label: string): void {
  assertFiniteNumber(vector.x, label + '.x');
  assertFiniteNumber(vector.y, label + '.y');
  assertFiniteNumber(vector.z, label + '.z');
}

function dot3D(first: Vec3, second: Vec3, label: string): number {
  const dot = first.x * second.x + first.y * second.y + first.z * second.z;
  assertFiniteNumber(dot, label);
  return dot;
}

function assertUnitNormal(normal: Vec3, label: string): void {
  assertVec3(normal, label);
  const length = Math.hypot(normal.x, normal.y, normal.z);
  assertFiniteNumber(length, label + ' magnitude');

  if (Math.abs(length - 1) > 1e-9) {
    throw new RangeError(label + ' must be a unit vector.');
  }
}

function assertAabb(box: Aabb, label: string): void {
  assertVec3(box.min, label + '.min');
  assertVec3(box.max, label + '.max');

  if (box.min.x > box.max.x || box.min.y > box.max.y || box.min.z > box.max.z) {
    throw new RangeError(label + ' min coordinates must not exceed max coordinates.');
  }
}

function assertSphere(sphere: Sphere, label: string): void {
  assertVec3(sphere.center, label + '.center');
  assertNonNegative(sphere.radius, label + '.radius');
}

export function distance3D(first: Vec3, second: Vec3): number {
  assertVec3(first, 'first point');
  assertVec3(second, 'second point');

  const distance = Math.hypot(first.x - second.x, first.y - second.y, first.z - second.z);
  assertFiniteNumber(distance, 'distance');

  return distance;
}

export function magnitude3D(vector: Vec3): number {
  assertVec3(vector, 'vector');

  const magnitude = Math.hypot(vector.x, vector.y, vector.z);
  assertFiniteNumber(magnitude, 'magnitude');

  return magnitude;
}

export function intersectsAabb(first: Aabb, second: Aabb): boolean {
  assertAabb(first, 'first AABB');
  assertAabb(second, 'second AABB');

  return (
    first.min.x <= second.max.x &&
    first.max.x >= second.min.x &&
    first.min.y <= second.max.y &&
    first.max.y >= second.min.y &&
    first.min.z <= second.max.z &&
    first.max.z >= second.min.z
  );
}

export function intersectsSpheres(first: Sphere, second: Sphere): boolean {
  assertSphere(first, 'first sphere');
  assertSphere(second, 'second sphere');

  const combinedRadius = first.radius + second.radius;
  assertFiniteNumber(combinedRadius, 'combined radius');

  return distance3D(first.center, second.center) <= combinedRadius;
}

export function intersectsSphereAabb(sphere: Sphere, box: Aabb): boolean {
  assertSphere(sphere, 'sphere');
  assertAabb(box, 'AABB');

  const closestPoint: Vec3 = {
    x: Math.max(box.min.x, Math.min(sphere.center.x, box.max.x)),
    y: Math.max(box.min.y, Math.min(sphere.center.y, box.max.y)),
    z: Math.max(box.min.z, Math.min(sphere.center.z, box.max.z)),
  };

  return distance3D(sphere.center, closestPoint) <= sphere.radius;
}

export function isLandingSuccessful(position: Vec3, targetPosition: Vec3, velocity: Vec3): boolean {
  const landingDistance = distance3D(position, targetPosition);
  const landingSpeed = magnitude3D(velocity);

  return landingDistance <= LANDING_MAX_DISTANCE && landingSpeed <= LANDING_STOP_SPEED;
}
/**
 * Measures a swept player-center contact against a circular landing patch on a plane.
 * The caller supplies the velocity before collision response so a later bounce cannot
 * erase the contact or its approach speed.
 */
export function measureLandingSurfaceContact(
  motion: LandingMotionSegment,
  target: LandingSurfaceTarget,
  limits: LandingContactLimits = {},
): LandingContactMeasurement {
  assertVec3(motion.previousPosition, 'motion.previousPosition');
  assertVec3(motion.position, 'motion.position');
  assertVec3(motion.approachVelocity, 'motion.approachVelocity');
  assertVec3(target.position, 'target.position');
  assertUnitNormal(target.normal, 'target.normal');

  const radius = limits.radius ?? LANDING_MAX_DISTANCE;
  const planeTolerance = limits.planeTolerance ?? LANDING_PLANE_TOLERANCE;
  const maxNormalSpeed = limits.maxNormalSpeed ?? LANDING_MAX_NORMAL_SPEED;
  assertNonNegative(radius, 'limits.radius');
  assertNonNegative(planeTolerance, 'limits.planeTolerance');
  assertNonNegative(maxNormalSpeed, 'limits.maxNormalSpeed');

  const previousOffset: Vec3 = {
    x: motion.previousPosition.x - target.position.x,
    y: motion.previousPosition.y - target.position.y,
    z: motion.previousPosition.z - target.position.z,
  };
  const currentOffset: Vec3 = {
    x: motion.position.x - target.position.x,
    y: motion.position.y - target.position.y,
    z: motion.position.z - target.position.z,
  };
  const previousNormalDistance = dot3D(
    previousOffset,
    target.normal,
    'previous landing normal distance',
  );
  const normalDistance = dot3D(currentOffset, target.normal, 'landing normal distance');
  const crossedPlane = previousNormalDistance > planeTolerance && normalDistance < -planeTolerance;
  const touchesPlane = Math.abs(normalDistance) <= planeTolerance;
  const contacted = previousNormalDistance >= -planeTolerance && (touchesPlane || crossedPlane);

  let radialOffset = currentOffset;

  if (crossedPlane) {
    const denominator = previousNormalDistance - normalDistance;
    assertFiniteNumber(denominator, 'landing crossing denominator');
    const crossingProgress = previousNormalDistance / denominator;
    assertFiniteNumber(crossingProgress, 'landing crossing progress');
    radialOffset = {
      x: previousOffset.x + (currentOffset.x - previousOffset.x) * crossingProgress,
      y: previousOffset.y + (currentOffset.y - previousOffset.y) * crossingProgress,
      z: previousOffset.z + (currentOffset.z - previousOffset.z) * crossingProgress,
    };
  }

  const radialNormalDistance = dot3D(radialOffset, target.normal, 'radial landing normal distance');
  const radialVector: Vec3 = {
    x: radialOffset.x - target.normal.x * radialNormalDistance,
    y: radialOffset.y - target.normal.y * radialNormalDistance,
    z: radialOffset.z - target.normal.z * radialNormalDistance,
  };
  const radialDistance = magnitude3D(radialVector);
  const normalVelocity = dot3D(motion.approachVelocity, target.normal, 'landing normal velocity');
  const normalSpeed = Math.max(0, -normalVelocity);
  const approaching = normalVelocity <= LANDING_APPROACH_EPSILON;

  assertFiniteNumber(normalSpeed, 'landing normal speed');

  return {
    previousNormalDistance,
    normalDistance,
    radialDistance,
    normalVelocity,
    normalSpeed,
    contacted,
    approaching,
    insideRadius: radialDistance <= radius,
    safeApproach: normalSpeed <= maxNormalSpeed,
  };
}

export function isLandingSurfaceContactSuccessful(
  motion: LandingMotionSegment,
  target: LandingSurfaceTarget,
  limits: LandingContactLimits = {},
): boolean {
  const contact = measureLandingSurfaceContact(motion, target, limits);

  return contact.contacted && contact.approaching && contact.insideRadius && contact.safeApproach;
}

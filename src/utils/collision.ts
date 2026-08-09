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

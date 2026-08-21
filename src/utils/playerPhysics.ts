import type { Vec3 } from '@/utils/collision';

export type PlayerFlightMode = 'hover' | 'landing-ready';

export interface PlayerSimulationState {
  readonly position: Vec3;
  readonly velocity: Vec3;
}

/**
 * Camera-relative control input consumed by the pure player simulation.
 * yaw=0 faces -Z, positive yaw turns toward +X, and positive pitch looks up.
 */
export interface ControlIntent {
  readonly forward: number;
  readonly right: number;
  readonly yaw: number;
  readonly pitch: number;
  readonly mode: PlayerFlightMode;
  /**
   * Unit normal pointing from the active landing surface into the playable corridor.
   * Omitted values preserve the original floor landing behaviour (+Y).
   */
  readonly landingSurfaceNormal?: Vec3;
}

/** Bounds already inset by the player's collider; they constrain its center. */
export interface PlayerCenterBounds {
  readonly min: Vec3;
  readonly max: Vec3;
}

export interface PlayerPhysicsConfig {
  readonly acceleration: number;
  readonly maxHorizontalSpeed: number;
  readonly maxVerticalSpeed: number;
  readonly horizontalDrag: number;
  readonly hoverVerticalDrag: number;
  readonly landingDescentSpeed: number;
  readonly landingVerticalResponse: number;
  readonly centerBounds: PlayerCenterBounds;
}

interface IntegratedComponent {
  readonly velocity: number;
  readonly displacement: number;
}

interface ResolvedAxis {
  readonly position: number;
  readonly velocity: number;
}

interface IntegratedVector {
  readonly velocity: Vec3;
  readonly displacement: Vec3;
}

const HALF_TURN = Math.PI / 2;
const NORMAL_EPSILON = 1e-9;

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

function assertPositive(value: number, label: string): void {
  assertFiniteNumber(value, label);

  if (value <= 0) {
    throw new RangeError(label + ' must be positive.');
  }
}

function assertVec3(vector: Vec3, label: string): void {
  assertFiniteNumber(vector.x, label + '.x');
  assertFiniteNumber(vector.y, label + '.y');
  assertFiniteNumber(vector.z, label + '.z');
}

function vectorLength(vector: Vec3): number {
  const length = Math.hypot(vector.x, vector.y, vector.z);
  assertFiniteNumber(length, 'vector length');
  return length;
}

function dot(first: Vec3, second: Vec3): number {
  const result = first.x * second.x + first.y * second.y + first.z * second.z;
  assertFiniteNumber(result, 'vector dot product');
  return result;
}

function scale(vector: Vec3, scalar: number): Vec3 {
  const result = {
    x: vector.x * scalar,
    y: vector.y * scalar,
    z: vector.z * scalar,
  };

  assertVec3(result, 'scaled vector');
  return result;
}

function add(first: Vec3, second: Vec3): Vec3 {
  const result = {
    x: first.x + second.x,
    y: first.y + second.y,
    z: first.z + second.z,
  };

  assertVec3(result, 'vector sum');
  return result;
}

function subtract(first: Vec3, second: Vec3): Vec3 {
  return add(first, scale(second, -1));
}

function normalize(vector: Vec3, label: string): Vec3 {
  assertVec3(vector, label);
  const length = vectorLength(vector);

  if (length <= NORMAL_EPSILON) {
    throw new RangeError(label + ' must have a non-zero length.');
  }

  return scale(vector, 1 / length);
}

function resolveLandingNormal(intent: ControlIntent): Vec3 {
  return normalize(intent.landingSurfaceNormal ?? { x: 0, y: 1, z: 0 }, 'landing surface normal');
}

function assertState(state: PlayerSimulationState): void {
  assertVec3(state.position, 'state.position');
  assertVec3(state.velocity, 'state.velocity');
}

function assertIntent(intent: ControlIntent): void {
  assertFiniteNumber(intent.forward, 'intent.forward');
  assertFiniteNumber(intent.right, 'intent.right');
  assertFiniteNumber(intent.yaw, 'intent.yaw');
  assertFiniteNumber(intent.pitch, 'intent.pitch');

  if (intent.mode !== 'hover' && intent.mode !== 'landing-ready') {
    throw new TypeError('intent.mode must be hover or landing-ready.');
  }

  if (intent.landingSurfaceNormal !== undefined) {
    normalize(intent.landingSurfaceNormal, 'landing surface normal');
  }
}

function assertConfig(config: PlayerPhysicsConfig): void {
  assertNonNegative(config.acceleration, 'config.acceleration');
  assertPositive(config.maxHorizontalSpeed, 'config.maxHorizontalSpeed');
  assertPositive(config.maxVerticalSpeed, 'config.maxVerticalSpeed');
  assertNonNegative(config.horizontalDrag, 'config.horizontalDrag');
  assertPositive(config.hoverVerticalDrag, 'config.hoverVerticalDrag');
  assertNonNegative(config.landingDescentSpeed, 'config.landingDescentSpeed');
  assertPositive(config.landingVerticalResponse, 'config.landingVerticalResponse');
  assertVec3(config.centerBounds.min, 'config.centerBounds.min');
  assertVec3(config.centerBounds.max, 'config.centerBounds.max');

  const { min, max } = config.centerBounds;

  if (min.x > max.x || min.y > max.y || min.z > max.z) {
    throw new RangeError('config.centerBounds min coordinates must not exceed max coordinates.');
  }

  if (config.landingDescentSpeed > config.maxVerticalSpeed) {
    throw new RangeError('config.landingDescentSpeed must not exceed maxVerticalSpeed.');
  }
}

function normalizeControlAxes(forward: number, right: number): readonly [number, number] {
  const largestAxis = Math.max(Math.abs(forward), Math.abs(right));

  if (largestAxis === 0) {
    return [0, 0];
  }

  if (largestAxis > 1) {
    const scaledLength = Math.hypot(forward / largestAxis, right / largestAxis);
    return [forward / largestAxis / scaledLength, right / largestAxis / scaledLength];
  }

  const length = Math.hypot(forward, right);

  if (length > 1) {
    return [forward / length, right / length];
  }

  return [forward, right];
}

/**
 * Converts camera-relative axes into a normalized world-space movement vector.
 * Landing-ready deliberately ignores pitch so looking up cannot cancel surface approach.
 */
export function derivePlayerMoveDirection(intent: ControlIntent): Vec3 {
  assertIntent(intent);

  const [forwardAxis, rightAxis] = normalizeControlAxes(intent.forward, intent.right);
  const pitch = Math.max(-HALF_TURN, Math.min(intent.pitch, HALF_TURN));
  const pitchCosine = intent.mode === 'hover' ? Math.cos(pitch) : 1;
  const forwardY = intent.mode === 'hover' ? Math.sin(pitch) : 0;
  const yawSine = Math.sin(intent.yaw);
  const yawCosine = Math.cos(intent.yaw);
  const result: Vec3 = {
    x: forwardAxis * yawSine * pitchCosine + rightAxis * yawCosine,
    y: forwardAxis * forwardY,
    z: -forwardAxis * yawCosine * pitchCosine + rightAxis * yawSine,
  };

  assertVec3(result, 'movement direction');
  return result;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}

function clampVectorMagnitude(vector: Vec3, maximum: number): Vec3 {
  const length = vectorLength(vector);

  if (length === 0 || length <= maximum) {
    return { ...vector };
  }

  return scale(vector, maximum / length);
}

function clampHorizontalVelocity(
  x: number,
  z: number,
  maxHorizontalSpeed: number,
): readonly [number, number] {
  const clamped = clampVectorMagnitude({ x, y: 0, z }, maxHorizontalSpeed);
  return [clamped.x, clamped.z];
}

function integrateDrivenDrag(
  initialVelocity: number,
  acceleration: number,
  drag: number,
  deltaSeconds: number,
): IntegratedComponent {
  if (drag === 0) {
    const velocity = initialVelocity + acceleration * deltaSeconds;
    const displacement =
      initialVelocity * deltaSeconds + 0.5 * acceleration * deltaSeconds * deltaSeconds;

    assertFiniteNumber(velocity, 'integrated velocity');
    assertFiniteNumber(displacement, 'integrated displacement');
    return { velocity, displacement };
  }

  const decay = Math.exp(-drag * deltaSeconds);
  const velocityChangeScale = -Math.expm1(-drag * deltaSeconds) / drag;
  const velocity = initialVelocity * decay + acceleration * velocityChangeScale;
  const displacement =
    initialVelocity * velocityChangeScale +
    (acceleration / drag) * (deltaSeconds - velocityChangeScale);

  assertFiniteNumber(velocity, 'integrated velocity');
  assertFiniteNumber(displacement, 'integrated displacement');
  return { velocity, displacement };
}

function integrateTowardVelocity(
  initialVelocity: number,
  targetVelocity: number,
  response: number,
  deltaSeconds: number,
): IntegratedComponent {
  const decay = Math.exp(-response * deltaSeconds);
  const responseIntegral = -Math.expm1(-response * deltaSeconds) / response;
  const difference = initialVelocity - targetVelocity;
  const velocity = targetVelocity + difference * decay;
  const displacement = targetVelocity * deltaSeconds + difference * responseIntegral;

  assertFiniteNumber(velocity, 'integrated velocity');
  assertFiniteNumber(displacement, 'integrated displacement');
  return { velocity, displacement };
}

function integrateTangent(
  initialVelocity: Vec3,
  acceleration: Vec3,
  drag: number,
  maximumSpeed: number,
  deltaSeconds: number,
): IntegratedVector {
  const integratedX = integrateDrivenDrag(initialVelocity.x, acceleration.x, drag, deltaSeconds);
  const integratedY = integrateDrivenDrag(initialVelocity.y, acceleration.y, drag, deltaSeconds);
  const integratedZ = integrateDrivenDrag(initialVelocity.z, acceleration.z, drag, deltaSeconds);
  const integratedVelocity = {
    x: integratedX.velocity,
    y: integratedY.velocity,
    z: integratedZ.velocity,
  };
  const velocity = clampVectorMagnitude(integratedVelocity, maximumSpeed);
  const wasCapped =
    velocity.x !== integratedVelocity.x ||
    velocity.y !== integratedVelocity.y ||
    velocity.z !== integratedVelocity.z;
  const displacement = wasCapped
    ? {
        x: (initialVelocity.x + velocity.x) * deltaSeconds * 0.5,
        y: (initialVelocity.y + velocity.y) * deltaSeconds * 0.5,
        z: (initialVelocity.z + velocity.z) * deltaSeconds * 0.5,
      }
    : {
        x: integratedX.displacement,
        y: integratedY.displacement,
        z: integratedZ.displacement,
      };

  assertVec3(velocity, 'integrated tangent velocity');
  assertVec3(displacement, 'integrated tangent displacement');
  return { velocity, displacement };
}

function resolveAxis(
  start: number,
  displacement: number,
  velocity: number,
  minimum: number,
  maximum: number,
): ResolvedAxis {
  const clampedStart = clamp(start, minimum, maximum);
  const proposedPosition = clampedStart + displacement;

  assertFiniteNumber(proposedPosition, 'proposed position');

  if (proposedPosition <= minimum) {
    return { position: minimum, velocity: 0 };
  }

  if (proposedPosition >= maximum) {
    return { position: maximum, velocity: 0 };
  }

  return { position: proposedPosition, velocity };
}

function resolveStateWithinBounds(
  state: PlayerSimulationState,
  displacement: Vec3,
  velocity: Vec3,
  bounds: PlayerCenterBounds,
): PlayerSimulationState {
  const resolvedX = resolveAxis(
    state.position.x,
    displacement.x,
    velocity.x,
    bounds.min.x,
    bounds.max.x,
  );
  const resolvedY = resolveAxis(
    state.position.y,
    displacement.y,
    velocity.y,
    bounds.min.y,
    bounds.max.y,
  );
  const resolvedZ = resolveAxis(
    state.position.z,
    displacement.z,
    velocity.z,
    bounds.min.z,
    bounds.max.z,
  );
  const result = {
    position: {
      x: resolvedX.position,
      y: resolvedY.position,
      z: resolvedZ.position,
    },
    velocity: {
      x: resolvedX.velocity,
      y: resolvedY.velocity,
      z: resolvedZ.velocity,
    },
  };

  assertState(result);
  return result;
}

function simulateLandingReadyStep(
  state: PlayerSimulationState,
  intent: ControlIntent,
  deltaSeconds: number,
  config: PlayerPhysicsConfig,
): PlayerSimulationState {
  const surfaceNormal = resolveLandingNormal(intent);
  const initialNormalVelocity = clamp(
    dot(state.velocity, surfaceNormal),
    -config.maxVerticalSpeed,
    config.maxVerticalSpeed,
  );
  const initialTangentVelocity = clampVectorMagnitude(
    subtract(state.velocity, scale(surfaceNormal, initialNormalVelocity)),
    config.maxHorizontalSpeed,
  );
  const requestedMovement = derivePlayerMoveDirection(intent);
  const tangentMovement = subtract(
    requestedMovement,
    scale(surfaceNormal, dot(requestedMovement, surfaceNormal)),
  );
  const tangentAcceleration = scale(tangentMovement, config.acceleration);
  const integratedTangent = integrateTangent(
    initialTangentVelocity,
    tangentAcceleration,
    config.horizontalDrag,
    config.maxHorizontalSpeed,
    deltaSeconds,
  );
  const integratedNormal = integrateTowardVelocity(
    initialNormalVelocity,
    -config.landingDescentSpeed,
    config.landingVerticalResponse,
    deltaSeconds,
  );
  const normalVelocity = clamp(
    integratedNormal.velocity,
    -config.maxVerticalSpeed,
    config.maxVerticalSpeed,
  );
  const normalWasCapped = normalVelocity !== integratedNormal.velocity;
  const normalDisplacement = normalWasCapped
    ? (initialNormalVelocity + normalVelocity) * deltaSeconds * 0.5
    : integratedNormal.displacement;
  const velocity = add(integratedTangent.velocity, scale(surfaceNormal, normalVelocity));
  const displacement = add(
    integratedTangent.displacement,
    scale(surfaceNormal, normalDisplacement),
  );

  return resolveStateWithinBounds(state, displacement, velocity, config.centerBounds);
}

function cloneState(state: PlayerSimulationState): PlayerSimulationState {
  return {
    position: { ...state.position },
    velocity: { ...state.velocity },
  };
}

/** Advances the player by one deterministic, delta-time-based simulation step. */
export function simulatePlayerStep(
  state: PlayerSimulationState,
  intent: ControlIntent,
  deltaSeconds: number,
  config: PlayerPhysicsConfig,
): PlayerSimulationState {
  assertFiniteNumber(deltaSeconds, 'deltaSeconds');

  if (deltaSeconds < 0) {
    throw new RangeError('deltaSeconds must be non-negative.');
  }

  assertState(state);
  assertIntent(intent);
  assertConfig(config);

  if (deltaSeconds === 0) {
    return cloneState(state);
  }

  if (intent.mode === 'landing-ready') {
    return simulateLandingReadyStep(state, intent, deltaSeconds, config);
  }

  const movement = derivePlayerMoveDirection(intent);
  const [initialVelocityX, initialVelocityZ] = clampHorizontalVelocity(
    state.velocity.x,
    state.velocity.z,
    config.maxHorizontalSpeed,
  );
  const initialVelocityY = clamp(
    state.velocity.y,
    -config.maxVerticalSpeed,
    config.maxVerticalSpeed,
  );
  const integratedX = integrateDrivenDrag(
    initialVelocityX,
    movement.x * config.acceleration,
    config.horizontalDrag,
    deltaSeconds,
  );
  const integratedZ = integrateDrivenDrag(
    initialVelocityZ,
    movement.z * config.acceleration,
    config.horizontalDrag,
    deltaSeconds,
  );
  const [velocityX, velocityZ] = clampHorizontalVelocity(
    integratedX.velocity,
    integratedZ.velocity,
    config.maxHorizontalSpeed,
  );
  const integratedY = integrateDrivenDrag(
    initialVelocityY,
    movement.y * config.acceleration,
    config.hoverVerticalDrag,
    deltaSeconds,
  );
  const velocityY = clamp(integratedY.velocity, -config.maxVerticalSpeed, config.maxVerticalSpeed);
  const horizontalVelocityWasCapped =
    integratedX.velocity !== velocityX || integratedZ.velocity !== velocityZ;
  const halfDelta = deltaSeconds * 0.5;
  const displacementX = horizontalVelocityWasCapped
    ? initialVelocityX * halfDelta + velocityX * halfDelta
    : integratedX.displacement;
  const displacementZ = horizontalVelocityWasCapped
    ? initialVelocityZ * halfDelta + velocityZ * halfDelta
    : integratedZ.displacement;
  const verticalVelocityWasCapped = integratedY.velocity !== velocityY;
  const displacementY = verticalVelocityWasCapped
    ? initialVelocityY * halfDelta + velocityY * halfDelta
    : integratedY.displacement;

  return resolveStateWithinBounds(
    state,
    { x: displacementX, y: displacementY, z: displacementZ },
    { x: velocityX, y: velocityY, z: velocityZ },
    config.centerBounds,
  );
}

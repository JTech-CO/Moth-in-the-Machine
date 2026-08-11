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

const HALF_TURN = Math.PI / 2;

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
 * Landing-ready deliberately ignores pitch so looking up cannot cancel descent.
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
  return Math.max(minimum, Math.min(value, maximum));
}

function clampHorizontalVelocity(
  x: number,
  z: number,
  maxHorizontalSpeed: number,
): readonly [number, number] {
  const largestComponent = Math.max(Math.abs(x), Math.abs(z));

  if (largestComponent === 0) {
    return [0, 0];
  }

  const scaledLength = Math.hypot(x / largestComponent, z / largestComponent);
  const speed = largestComponent * scaledLength;

  if (Number.isFinite(speed) && speed <= maxHorizontalSpeed) {
    return [x, z];
  }

  return [
    (x / largestComponent / scaledLength) * maxHorizontalSpeed,
    (z / largestComponent / scaledLength) * maxHorizontalSpeed,
  ];
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
  const integratedY =
    intent.mode === 'hover'
      ? integrateDrivenDrag(
          initialVelocityY,
          movement.y * config.acceleration,
          config.hoverVerticalDrag,
          deltaSeconds,
        )
      : integrateTowardVelocity(
          initialVelocityY,
          -config.landingDescentSpeed,
          config.landingVerticalResponse,
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
  const verticalVelocityWasCapped = intent.mode === 'hover' && integratedY.velocity !== velocityY;
  const displacementY = verticalVelocityWasCapped
    ? initialVelocityY * halfDelta + velocityY * halfDelta
    : integratedY.displacement;

  const resolvedX = resolveAxis(
    state.position.x,
    displacementX,
    velocityX,
    config.centerBounds.min.x,
    config.centerBounds.max.x,
  );
  const resolvedY = resolveAxis(
    state.position.y,
    displacementY,
    velocityY,
    config.centerBounds.min.y,
    config.centerBounds.max.y,
  );
  const resolvedZ = resolveAxis(
    state.position.z,
    displacementZ,
    velocityZ,
    config.centerBounds.min.z,
    config.centerBounds.max.z,
  );
  const result: PlayerSimulationState = {
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

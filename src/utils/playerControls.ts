export type FlightMode = 'hover' | 'landing-ready';

export interface MoveAxes {
  readonly forward: number;
  readonly right: number;
}

export interface LookAngles {
  readonly yaw: number;
  readonly pitch: number;
}

export interface LookInputConfig {
  readonly yawRadiansPerMovementUnit: number;
  readonly pitchRadiansPerMovementUnit: number;
  readonly maximumMovementPerEvent: number;
  readonly pitchLimitRadians: number;
  readonly responsePerSecond: number;
  readonly maximumYawRadiansPerSecond: number;
  readonly maximumPitchRadiansPerSecond: number;
}

export const DEFAULT_LOOK_INPUT_CONFIG: Readonly<LookInputConfig> = Object.freeze({
  yawRadiansPerMovementUnit: 0.001,
  pitchRadiansPerMovementUnit: 0.0008,
  maximumMovementPerEvent: 120,
  pitchLimitRadians: Math.PI / 4,
  responsePerSecond: 18,
  maximumYawRadiansPerSecond: 4.5,
  maximumPitchRadiansPerSecond: 3.5,
});

const FORWARD_CODES = ['KeyW', 'ArrowUp'] as const;
const BACKWARD_CODES = ['KeyS', 'ArrowDown'] as const;
const LEFT_CODES = ['KeyA', 'ArrowLeft'] as const;
const RIGHT_CODES = ['KeyD', 'ArrowRight'] as const;
const DIAGONAL_AXIS = Math.SQRT1_2;
const FULL_TURN = Math.PI * 2;

function hasAnyCode(activeCodes: ReadonlySet<string>, codes: readonly string[]): boolean {
  return codes.some((code) => activeCodes.has(code));
}

function assertFinite(value: number, label: string): void {
  if (!Number.isFinite(value)) {
    throw new RangeError(label + ' must be finite.');
  }
}

function assertNonNegative(value: number, label: string): void {
  assertFinite(value, label);

  if (value < 0) {
    throw new RangeError(label + ' must be non-negative.');
  }
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}

function normalizeAngle(angle: number): number {
  const normalized = ((((angle + Math.PI) % FULL_TURN) + FULL_TURN) % FULL_TURN) - Math.PI;

  assertFinite(normalized, 'normalized angle');
  return normalized;
}

function assertLookAngles(angles: LookAngles, label: string): void {
  assertFinite(angles.yaw, label + ' yaw');
  assertFinite(angles.pitch, label + ' pitch');
}

function assertLookConfig(config: LookInputConfig): void {
  assertNonNegative(config.yawRadiansPerMovementUnit, 'yaw sensitivity');
  assertNonNegative(config.pitchRadiansPerMovementUnit, 'pitch sensitivity');
  assertNonNegative(config.maximumMovementPerEvent, 'maximum movement per event');
  assertNonNegative(config.pitchLimitRadians, 'pitch limit');
  assertNonNegative(config.responsePerSecond, 'look response');
  assertNonNegative(config.maximumYawRadiansPerSecond, 'maximum yaw rate');
  assertNonNegative(config.maximumPitchRadiansPerSecond, 'maximum pitch rate');
}

export function deriveMoveAxes(activeCodeIterable: Iterable<string>): MoveAxes {
  const activeCodes = new Set(activeCodeIterable);
  const forward =
    Number(hasAnyCode(activeCodes, FORWARD_CODES)) -
    Number(hasAnyCode(activeCodes, BACKWARD_CODES));
  const right =
    Number(hasAnyCode(activeCodes, RIGHT_CODES)) - Number(hasAnyCode(activeCodes, LEFT_CODES));

  if (forward !== 0 && right !== 0) {
    return {
      forward: forward * DIAGONAL_AXIS,
      right: right * DIAGONAL_AXIS,
    };
  }

  return { forward, right };
}

export function toggleFlightMode(mode: FlightMode): FlightMode {
  if (mode === 'hover') {
    return 'landing-ready';
  }

  if (mode === 'landing-ready') {
    return 'hover';
  }

  throw new TypeError('flight mode must be hover or landing-ready.');
}

export function updateLookAngles(
  current: LookAngles,
  mouseDeltaX: number,
  mouseDeltaY: number,
  config: LookInputConfig = DEFAULT_LOOK_INPUT_CONFIG,
): LookAngles {
  assertLookAngles(current, 'current');
  assertFinite(mouseDeltaX, 'mouse delta x');
  assertFinite(mouseDeltaY, 'mouse delta y');
  assertLookConfig(config);

  const boundedDeltaX = clamp(
    mouseDeltaX,
    -config.maximumMovementPerEvent,
    config.maximumMovementPerEvent,
  );
  const boundedDeltaY = clamp(
    mouseDeltaY,
    -config.maximumMovementPerEvent,
    config.maximumMovementPerEvent,
  );
  const yaw = normalizeAngle(current.yaw + boundedDeltaX * config.yawRadiansPerMovementUnit);
  const unclampedPitch = current.pitch - boundedDeltaY * config.pitchRadiansPerMovementUnit;

  assertFinite(unclampedPitch, 'updated pitch');

  return {
    yaw,
    pitch: clamp(unclampedPitch, -config.pitchLimitRadians, config.pitchLimitRadians),
  };
}

export function smoothLookAngles(
  current: LookAngles,
  target: LookAngles,
  responsePerSecond: number,
  deltaSeconds: number,
  maximumYawRadiansPerSecond = DEFAULT_LOOK_INPUT_CONFIG.maximumYawRadiansPerSecond,
  maximumPitchRadiansPerSecond = DEFAULT_LOOK_INPUT_CONFIG.maximumPitchRadiansPerSecond,
): LookAngles {
  assertLookAngles(current, 'current');
  assertLookAngles(target, 'target');
  assertNonNegative(responsePerSecond, 'look response');
  assertNonNegative(deltaSeconds, 'look delta');
  assertNonNegative(maximumYawRadiansPerSecond, 'maximum yaw rate');
  assertNonNegative(maximumPitchRadiansPerSecond, 'maximum pitch rate');

  const responseDelta = responsePerSecond * deltaSeconds;
  assertFinite(responseDelta, 'look response delta');

  const currentYaw = normalizeAngle(current.yaw);

  if (responseDelta === 0) {
    return {
      yaw: currentYaw,
      pitch: current.pitch,
    };
  }

  const maximumYawStep = maximumYawRadiansPerSecond * deltaSeconds;
  const maximumPitchStep = maximumPitchRadiansPerSecond * deltaSeconds;
  assertFinite(maximumYawStep, 'maximum yaw step');
  assertFinite(maximumPitchStep, 'maximum pitch step');

  const blend = -Math.expm1(-responseDelta);
  const shortestYawDelta = normalizeAngle(target.yaw - currentYaw);
  const yawStep = clamp(shortestYawDelta * blend, -maximumYawStep, maximumYawStep);
  const pitchStep = clamp(
    (target.pitch - current.pitch) * blend,
    -maximumPitchStep,
    maximumPitchStep,
  );

  return {
    yaw: normalizeAngle(currentYaw + yawStep),
    pitch: current.pitch + pitchStep,
  };
}

export type FlightMode = 'hover' | 'landing-ready';

export interface MoveAxes {
  readonly forward: number;
  readonly right: number;
}

export interface LookAngles {
  readonly yaw: number;
  readonly pitch: number;
}

const FORWARD_CODES = ['KeyW', 'ArrowUp'] as const;
const BACKWARD_CODES = ['KeyS', 'ArrowDown'] as const;
const LEFT_CODES = ['KeyA', 'ArrowLeft'] as const;
const RIGHT_CODES = ['KeyD', 'ArrowRight'] as const;
const DIAGONAL_AXIS = Math.SQRT1_2;

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
  sensitivity: number,
  pitchLimit: number,
): LookAngles {
  assertFinite(current.yaw, 'current yaw');
  assertFinite(current.pitch, 'current pitch');
  assertFinite(mouseDeltaX, 'mouse delta x');
  assertFinite(mouseDeltaY, 'mouse delta y');
  assertNonNegative(sensitivity, 'look sensitivity');
  assertNonNegative(pitchLimit, 'pitch limit');

  const yaw = current.yaw + mouseDeltaX * sensitivity;
  const unclampedPitch = current.pitch - mouseDeltaY * sensitivity;

  assertFinite(yaw, 'updated yaw');
  assertFinite(unclampedPitch, 'updated pitch');

  return {
    yaw,
    pitch: Math.max(-pitchLimit, Math.min(pitchLimit, unclampedPitch)),
  };
}

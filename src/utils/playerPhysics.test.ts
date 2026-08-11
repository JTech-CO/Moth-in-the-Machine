import { describe, expect, it } from 'vitest';

import {
  derivePlayerMoveDirection,
  simulatePlayerStep,
  type ControlIntent,
  type PlayerPhysicsConfig,
  type PlayerSimulationState,
} from '@/utils/playerPhysics';

const CONFIG: PlayerPhysicsConfig = {
  acceleration: 6,
  maxHorizontalSpeed: 4,
  maxVerticalSpeed: 3,
  horizontalDrag: 2,
  hoverVerticalDrag: 4,
  landingDescentSpeed: 1,
  landingVerticalResponse: 5,
  centerBounds: {
    min: { x: -5, y: -2, z: -10 },
    max: { x: 5, y: 3, z: 10 },
  },
};

const HOVER_INTENT: ControlIntent = {
  forward: 0,
  right: 0,
  yaw: 0,
  pitch: 0,
  mode: 'hover',
};

function state(
  position = { x: 0, y: 0, z: 0 },
  velocity = { x: 0, y: 0, z: 0 },
): PlayerSimulationState {
  return { position, velocity };
}

function runFor(
  framesPerSecond: number,
  durationSeconds: number,
  intent: ControlIntent,
  initialState = state(),
  config = CONFIG,
): PlayerSimulationState {
  let result = initialState;
  const frameCount = framesPerSecond * durationSeconds;

  for (let frame = 0; frame < frameCount; frame += 1) {
    result = simulatePlayerStep(result, intent, 1 / framesPerSecond, config);
  }

  return result;
}

describe('player physics', () => {
  describe('camera-relative movement', () => {
    it('uses -Z as yaw-zero forward and +X as yaw-zero right', () => {
      expect(derivePlayerMoveDirection({ ...HOVER_INTENT, forward: 1 })).toEqual({
        x: 0,
        y: 0,
        z: -1,
      });
      expect(derivePlayerMoveDirection({ ...HOVER_INTENT, right: 1 })).toEqual({
        x: 1,
        y: 0,
        z: 0,
      });
    });

    it('rotates forward and strafe with yaw', () => {
      const forward = derivePlayerMoveDirection({
        ...HOVER_INTENT,
        forward: 1,
        yaw: Math.PI / 2,
      });
      const right = derivePlayerMoveDirection({
        ...HOVER_INTENT,
        right: 1,
        yaw: Math.PI / 2,
      });

      expect(forward.x).toBeCloseTo(1);
      expect(forward.z).toBeCloseTo(0);
      expect(right.x).toBeCloseTo(0);
      expect(right.z).toBeCloseTo(1);
    });

    it('follows positive pitch upward in hover mode', () => {
      const movement = derivePlayerMoveDirection({
        ...HOVER_INTENT,
        forward: 1,
        pitch: Math.PI / 6,
      });

      expect(movement.x).toBeCloseTo(0);
      expect(movement.y).toBeCloseTo(0.5);
      expect(movement.z).toBeCloseTo(-Math.sqrt(3) / 2);
    });

    it('normalizes diagonal and oversized axes', () => {
      const diagonal = derivePlayerMoveDirection({
        ...HOVER_INTENT,
        forward: 1,
        right: 1,
      });
      const oversized = derivePlayerMoveDirection({
        ...HOVER_INTENT,
        forward: Number.MAX_VALUE,
        right: Number.MAX_VALUE,
      });

      expect(Math.hypot(diagonal.x, diagonal.y, diagonal.z)).toBeCloseTo(1);
      expect(Math.hypot(oversized.x, oversized.y, oversized.z)).toBeCloseTo(1);
    });
  });

  describe('delta-time dynamics', () => {
    it('is approximately invariant at 30, 60, and 120 fps', () => {
      const intent: ControlIntent = {
        ...HOVER_INTENT,
        forward: 0.8,
        right: 0.4,
        yaw: 0.35,
        pitch: 0.2,
      };
      const at30 = runFor(30, 1, intent);
      const at60 = runFor(60, 1, intent);
      const at120 = runFor(120, 1, intent);

      for (const axis of ['x', 'y', 'z'] as const) {
        expect(at30.position[axis]).toBeCloseTo(at120.position[axis], 8);
        expect(at60.position[axis]).toBeCloseTo(at120.position[axis], 8);
        expect(at30.velocity[axis]).toBeCloseTo(at120.velocity[axis], 8);
        expect(at60.velocity[axis]).toBeCloseTo(at120.velocity[axis], 8);
      }
    });

    it('keeps capped-speed travel stable across frame rates', () => {
      const wideBoundsConfig: PlayerPhysicsConfig = {
        ...CONFIG,
        acceleration: 20,
        horizontalDrag: 0,
        maxHorizontalSpeed: 1.7,
        centerBounds: {
          min: { x: -100, y: -100, z: -100 },
          max: { x: 100, y: 100, z: 100 },
        },
      };
      const intent = { ...HOVER_INTENT, forward: 1 };
      const at30 = runFor(30, 3, intent, state(), wideBoundsConfig);
      const at60 = runFor(60, 3, intent, state(), wideBoundsConfig);
      const at120 = runFor(120, 3, intent, state(), wideBoundsConfig);

      expect(at30.position.z).toBeCloseTo(at120.position.z, 2);
      expect(at60.position.z).toBeCloseTo(at120.position.z, 2);
      expect(at30.velocity.z).toBeCloseTo(-wideBoundsConfig.maxHorizontalSpeed, 8);
      expect(at60.velocity.z).toBeCloseTo(at120.velocity.z, 8);
    });

    it('keeps inertia and applies exponential drag after release', () => {
      const initial = state(undefined, { x: 2, y: 0, z: -1 });
      const result = simulatePlayerStep(initial, HOVER_INTENT, 0.5, CONFIG);
      const decay = Math.exp(-CONFIG.horizontalDrag * 0.5);

      expect(result.velocity.x).toBeCloseTo(2 * decay);
      expect(result.velocity.z).toBeCloseTo(-decay);
      expect(result.position.x).toBeGreaterThan(0);
      expect(result.position.z).toBeLessThan(0);
    });

    it('caps horizontal speed without changing its direction', () => {
      const uncappedConfig = { ...CONFIG, horizontalDrag: 0 };
      const result = simulatePlayerStep(
        state(undefined, { x: 4, y: 0, z: 4 }),
        { ...HOVER_INTENT, forward: -1, right: 1 },
        1,
        uncappedConfig,
      );

      expect(Math.hypot(result.velocity.x, result.velocity.z)).toBeCloseTo(
        uncappedConfig.maxHorizontalSpeed,
      );
      expect(result.velocity.x).toBeGreaterThan(0);
      expect(result.velocity.z).toBeGreaterThan(0);
    });
  });

  describe('flight modes', () => {
    it('stabilizes vertical velocity in hover mode', () => {
      const result = simulatePlayerStep(
        state(undefined, { x: 0, y: 2, z: 0 }),
        HOVER_INTENT,
        0.25,
        CONFIG,
      );

      expect(result.velocity.y).toBeCloseTo(2 * Math.exp(-1));
      expect(result.velocity.y).toBeGreaterThan(0);
    });

    it('allows pitched forward input to climb while hovering', () => {
      const result = simulatePlayerStep(
        state(),
        { ...HOVER_INTENT, forward: 1, pitch: Math.PI / 4 },
        0.25,
        CONFIG,
      );

      expect(result.position.y).toBeGreaterThan(0);
      expect(result.velocity.y).toBeGreaterThan(0);
    });

    it('descends controllably in landing-ready while retaining horizontal steering', () => {
      const intent: ControlIntent = {
        ...HOVER_INTENT,
        forward: 1,
        right: 0.5,
        pitch: Math.PI / 2,
        mode: 'landing-ready',
      };
      const result = simulatePlayerStep(state(), intent, 0.25, CONFIG);

      expect(result.velocity.y).toBeLessThan(0);
      expect(result.velocity.y).toBeGreaterThanOrEqual(-CONFIG.landingDescentSpeed);
      expect(result.position.y).toBeLessThan(0);
      expect(result.position.x).toBeGreaterThan(0);
      expect(result.position.z).toBeLessThan(0);
    });

    it('approaches the configured landing descent speed independently of upward pitch', () => {
      const result = runFor(120, 1, {
        ...HOVER_INTENT,
        forward: 1,
        pitch: Math.PI / 2,
        mode: 'landing-ready',
      });

      expect(result.velocity.y).toBeCloseTo(-CONFIG.landingDescentSpeed, 1);
    });
  });

  describe('corridor bounds', () => {
    it.each([
      { axis: 'x' as const, position: 4, velocity: 100, boundary: 5 },
      { axis: 'x' as const, position: -4, velocity: -100, boundary: -5 },
      { axis: 'y' as const, position: 2, velocity: 100, boundary: 3 },
      { axis: 'y' as const, position: -1, velocity: -100, boundary: -2 },
      { axis: 'z' as const, position: 9, velocity: 100, boundary: 10 },
      { axis: 'z' as const, position: -9, velocity: -100, boundary: -10 },
    ])('prevents high-speed tunneling through the $axis boundary', (scenario) => {
      const position = { x: 0, y: 0, z: 0, [scenario.axis]: scenario.position };
      const velocity = { x: 0, y: 0, z: 0, [scenario.axis]: scenario.velocity };
      const highSpeedConfig = {
        ...CONFIG,
        maxHorizontalSpeed: 200,
        maxVerticalSpeed: 200,
        horizontalDrag: 0,
        hoverVerticalDrag: 0.000_001,
      };
      const result = simulatePlayerStep(
        state(position, velocity),
        HOVER_INTENT,
        1,
        highSpeedConfig,
      );

      expect(result.position[scenario.axis]).toBe(scenario.boundary);
      expect(result.velocity[scenario.axis]).toBe(0);
    });

    it('zeros outward normal velocity when movement ends exactly on a boundary', () => {
      const result = simulatePlayerStep(
        state({ x: 4, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }),
        HOVER_INTENT,
        1,
        { ...CONFIG, horizontalDrag: 0 },
      );

      expect(result.position.x).toBe(CONFIG.centerBounds.max.x);
      expect(result.velocity.x).toBe(0);
    });

    it('slides along a wall by preserving tangent motion', () => {
      const result = simulatePlayerStep(
        state({ x: 4.9, y: 0, z: 0 }, { x: 10, y: 0, z: -2 }),
        HOVER_INTENT,
        0.2,
        { ...CONFIG, maxHorizontalSpeed: 20, horizontalDrag: 0 },
      );

      expect(result.position.x).toBe(CONFIG.centerBounds.max.x);
      expect(result.velocity.x).toBe(0);
      expect(result.position.z).toBeLessThan(0);
      expect(result.velocity.z).toBe(-2);
    });

    it('zeros both normal velocities when reaching a corner', () => {
      const result = simulatePlayerStep(
        state({ x: 4.9, y: 0, z: -9.9 }, { x: 10, y: 0, z: -10 }),
        HOVER_INTENT,
        0.2,
        { ...CONFIG, maxHorizontalSpeed: 20, horizontalDrag: 0 },
      );

      expect(result.position.x).toBe(CONFIG.centerBounds.max.x);
      expect(result.position.z).toBe(CONFIG.centerBounds.min.z);
      expect(result.velocity.x).toBe(0);
      expect(result.velocity.z).toBe(0);
    });

    it('recovers an out-of-bounds starting center before moving', () => {
      const result = simulatePlayerStep(
        state({ x: 100, y: -100, z: 100 }),
        HOVER_INTENT,
        0.1,
        CONFIG,
      );

      expect(result.position).toEqual({ x: 5, y: -2, z: 10 });
    });
  });

  describe('validation and immutability', () => {
    it('treats zero delta as a fresh, exact no-op', () => {
      const initial = state({ x: 1, y: 2, z: 3 }, { x: 0.5, y: -0.25, z: 1 });
      const result = simulatePlayerStep(initial, HOVER_INTENT, 0, CONFIG);

      expect(result).toEqual(initial);
      expect(result).not.toBe(initial);
      expect(result.position).not.toBe(initial.position);
      expect(result.velocity).not.toBe(initial.velocity);
    });

    it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, -0.01])(
      'rejects invalid delta %s',
      (deltaSeconds) => {
        expect(() => simulatePlayerStep(state(), HOVER_INTENT, deltaSeconds, CONFIG)).toThrow(
          RangeError,
        );
      },
    );

    it('rejects non-finite state and intent values', () => {
      expect(() =>
        simulatePlayerStep(state({ x: Number.NaN, y: 0, z: 0 }), HOVER_INTENT, 0.1, CONFIG),
      ).toThrow(RangeError);
      expect(() =>
        simulatePlayerStep(
          state(undefined, { x: 0, y: Number.POSITIVE_INFINITY, z: 0 }),
          HOVER_INTENT,
          0.1,
          CONFIG,
        ),
      ).toThrow(RangeError);
      expect(() =>
        simulatePlayerStep(state(), { ...HOVER_INTENT, yaw: Number.NaN }, 0.1, CONFIG),
      ).toThrow(RangeError);
      expect(() =>
        simulatePlayerStep(
          state(),
          { ...HOVER_INTENT, pitch: Number.NEGATIVE_INFINITY },
          0.1,
          CONFIG,
        ),
      ).toThrow(RangeError);
    });

    it('rejects invalid modes and configurations', () => {
      expect(() =>
        simulatePlayerStep(state(), { ...HOVER_INTENT, mode: 'landed' as never }, 0.1, CONFIG),
      ).toThrow(TypeError);
      expect(() =>
        simulatePlayerStep(state(), HOVER_INTENT, 0.1, {
          ...CONFIG,
          horizontalDrag: -1,
        }),
      ).toThrow(RangeError);
      expect(() =>
        simulatePlayerStep(state(), HOVER_INTENT, 0.1, {
          ...CONFIG,
          centerBounds: {
            min: { x: 2, y: 0, z: 0 },
            max: { x: 1, y: 1, z: 1 },
          },
        }),
      ).toThrow(RangeError);
      expect(() =>
        simulatePlayerStep(state(), HOVER_INTENT, 0.1, {
          ...CONFIG,
          maxVerticalSpeed: Number.NaN,
        }),
      ).toThrow(RangeError);
    });

    it('does not mutate frozen inputs and returns only finite values', () => {
      const initial = Object.freeze({
        position: Object.freeze({ x: 0, y: 0, z: 0 }),
        velocity: Object.freeze({ x: 0, y: 0, z: 0 }),
      });
      const intent = Object.freeze({ ...HOVER_INTENT, forward: 1 });
      const config = Object.freeze({
        ...CONFIG,
        centerBounds: Object.freeze({
          min: Object.freeze({ ...CONFIG.centerBounds.min }),
          max: Object.freeze({ ...CONFIG.centerBounds.max }),
        }),
      });
      const result = simulatePlayerStep(initial, intent, 0.1, config);
      const values = [...Object.values(result.position), ...Object.values(result.velocity)];

      expect(values.every(Number.isFinite)).toBe(true);
      expect(initial).toEqual(state());
      expect(intent).toEqual({ ...HOVER_INTENT, forward: 1 });
      expect(config).toEqual(CONFIG);
    });

    it('returns only finite values for representable extreme inputs', () => {
      const result = simulatePlayerStep(
        state(undefined, { x: 0, y: Number.MAX_VALUE, z: 0 }),
        HOVER_INTENT,
        Number.MAX_VALUE,
        { ...CONFIG, maxVerticalSpeed: Number.MAX_VALUE },
      );
      const values = [...Object.values(result.position), ...Object.values(result.velocity)];

      expect(values.every(Number.isFinite)).toBe(true);
    });
  });
});

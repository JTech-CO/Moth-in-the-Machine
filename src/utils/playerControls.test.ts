import { describe, expect, it } from 'vitest';

import {
  DEFAULT_LOOK_INPUT_CONFIG,
  deriveMoveAxes,
  smoothLookAngles,
  toggleFlightMode,
  updateLookAngles,
  type LookAngles,
  type LookInputConfig,
} from '@/utils/playerControls';

describe('player control utilities', () => {
  describe('deriveMoveAxes', () => {
    it.each([
      { codes: ['KeyW'], expected: { forward: 1, right: 0 } },
      { codes: ['ArrowUp'], expected: { forward: 1, right: 0 } },
      { codes: ['KeyS'], expected: { forward: -1, right: 0 } },
      { codes: ['ArrowDown'], expected: { forward: -1, right: 0 } },
      { codes: ['KeyA'], expected: { forward: 0, right: -1 } },
      { codes: ['ArrowLeft'], expected: { forward: 0, right: -1 } },
      { codes: ['KeyD'], expected: { forward: 0, right: 1 } },
      { codes: ['ArrowRight'], expected: { forward: 0, right: 1 } },
    ])('maps $codes to movement axes', ({ codes, expected }) => {
      expect(deriveMoveAxes(codes)).toEqual(expected);
    });

    it('cancels opposing directions and ignores unrelated codes', () => {
      expect(deriveMoveAxes(new Set(['KeyW', 'ArrowDown', 'KeyA', 'KeyD', 'Space']))).toEqual({
        forward: 0,
        right: 0,
      });
    });

    it('does not double-count equivalent keys or duplicate iterable entries', () => {
      expect(deriveMoveAxes(['KeyW', 'ArrowUp', 'KeyW'])).toEqual({ forward: 1, right: 0 });
    });

    it('normalizes diagonal movement to unit length', () => {
      const axes = deriveMoveAxes(new Set(['KeyW', 'ArrowRight']));

      expect(axes.forward).toBeCloseTo(Math.SQRT1_2);
      expect(axes.right).toBeCloseTo(Math.SQRT1_2);
      expect(Math.hypot(axes.forward, axes.right)).toBeCloseTo(1);
    });

    it('returns neutral axes for an empty iterable', () => {
      expect(deriveMoveAxes([])).toEqual({ forward: 0, right: 0 });
    });
  });

  describe('toggleFlightMode', () => {
    it('toggles between hover and landing-ready', () => {
      expect(toggleFlightMode('hover')).toBe('landing-ready');
      expect(toggleFlightMode('landing-ready')).toBe('hover');
    });

    it('rejects an unknown runtime mode', () => {
      expect(() => toggleFlightMode('landed' as never)).toThrow(TypeError);
    });
  });

  describe('updateLookAngles', () => {
    it('uses the calmer yaw and pitch defaults', () => {
      const result = updateLookAngles({ yaw: 0, pitch: 0 }, 100, -100);

      expect(result.yaw).toBeCloseTo(0.1);
      expect(result.pitch).toBeCloseTo(0.08);
    });

    it('caps coalesced high-sensitivity spikes per event', () => {
      const result = updateLookAngles({ yaw: 0, pitch: 0 }, 1000, -1000);

      expect(result.yaw).toBeCloseTo(0.12);
      expect(result.pitch).toBeCloseTo(0.096);
    });

    it('clamps pitch symmetrically and normalizes yaw', () => {
      const config: LookInputConfig = {
        ...DEFAULT_LOOK_INPUT_CONFIG,
        yawRadiansPerMovementUnit: 0.1,
        pitchRadiansPerMovementUnit: 0.1,
        maximumMovementPerEvent: 100,
        pitchLimitRadians: 0.75,
      };
      const positive = updateLookAngles({ yaw: Math.PI - 0.05, pitch: 0 }, 2, -100, config);
      const negative = updateLookAngles({ yaw: -Math.PI + 0.05, pitch: 0 }, -2, 100, config);

      expect(positive.yaw).toBeCloseTo(-Math.PI + 0.15);
      expect(positive.pitch).toBe(0.75);
      expect(negative.yaw).toBeCloseTo(Math.PI - 0.15);
      expect(negative.pitch).toBe(-0.75);
    });

    it('supports zero sensitivity, movement cap, and pitch limit', () => {
      expect(
        updateLookAngles({ yaw: 0.4, pitch: 0.3 }, 20, -20, {
          yawRadiansPerMovementUnit: 0,
          pitchRadiansPerMovementUnit: 0,
          maximumMovementPerEvent: 0,
          pitchLimitRadians: 0,
          responsePerSecond: 0,
          maximumYawRadiansPerSecond: 0,
          maximumPitchRadiansPerSecond: 0,
        }),
      ).toEqual({
        yaw: expect.closeTo(0.4),
        pitch: 0,
      });
    });

    it.each([
      {
        current: { yaw: Number.NaN, pitch: 0 },
        dx: 0,
        dy: 0,
        config: DEFAULT_LOOK_INPUT_CONFIG,
      },
      {
        current: { yaw: 0, pitch: Number.POSITIVE_INFINITY },
        dx: 0,
        dy: 0,
        config: DEFAULT_LOOK_INPUT_CONFIG,
      },
      {
        current: { yaw: 0, pitch: 0 },
        dx: Number.NaN,
        dy: 0,
        config: DEFAULT_LOOK_INPUT_CONFIG,
      },
      {
        current: { yaw: 0, pitch: 0 },
        dx: 0,
        dy: Number.NEGATIVE_INFINITY,
        config: DEFAULT_LOOK_INPUT_CONFIG,
      },
      {
        current: { yaw: 0, pitch: 0 },
        dx: 0,
        dy: 0,
        config: {
          ...DEFAULT_LOOK_INPUT_CONFIG,
          maximumMovementPerEvent: Number.POSITIVE_INFINITY,
        },
      },
      {
        current: { yaw: 0, pitch: 0 },
        dx: 0,
        dy: 0,
        config: { ...DEFAULT_LOOK_INPUT_CONFIG, yawRadiansPerMovementUnit: -0.01 },
      },
      {
        current: { yaw: 0, pitch: 0 },
        dx: 0,
        dy: 0,
        config: { ...DEFAULT_LOOK_INPUT_CONFIG, pitchLimitRadians: -1 },
      },
    ])('rejects invalid look input %#', ({ current, dx, dy, config }) => {
      expect(() => updateLookAngles(current, dx, dy, config)).toThrow(RangeError);
    });
  });

  describe('smoothLookAngles', () => {
    function runForOneSecond(fps: number): LookAngles {
      let look: LookAngles = { yaw: 0, pitch: 0 };

      for (let frame = 0; frame < fps; frame += 1) {
        look = smoothLookAngles(look, { yaw: 1, pitch: 0.5 }, 18, 1 / fps);
      }

      return look;
    }

    it('takes the shortest path across the yaw wrap boundary', () => {
      const degrees = Math.PI / 180;
      const result = smoothLookAngles(
        { yaw: 179 * degrees, pitch: 0 },
        { yaw: -179 * degrees, pitch: 0.4 },
        18,
        1 / 120,
      );

      expect(result.yaw).toBeGreaterThan(179 * degrees);
      expect(result.yaw).toBeLessThanOrEqual(Math.PI);
      expect(result.pitch).toBeGreaterThan(0);
      expect(result.pitch).toBeLessThan(0.4);
    });

    it('caps applied angular velocity even when many input events move the target', () => {
      const delta = 1 / 120;
      const result = smoothLookAngles(
        { yaw: 0, pitch: 0 },
        { yaw: Math.PI - 0.01, pitch: 1 },
        18,
        delta,
        4.5,
        3.5,
      );

      expect(result.yaw).toBeCloseTo(4.5 * delta);
      expect(result.pitch).toBeCloseTo(3.5 * delta);
    });

    it('is frame-rate independent over the same elapsed time', () => {
      const at30 = runForOneSecond(30);
      const at60 = runForOneSecond(60);
      const at120 = runForOneSecond(120);

      expect(at30.yaw).toBeCloseTo(at60.yaw, 10);
      expect(at60.yaw).toBeCloseTo(at120.yaw, 10);
      expect(at30.pitch).toBeCloseTo(at120.pitch, 9);
    });

    it('does not move or overshoot with a zero response or delta', () => {
      expect(smoothLookAngles({ yaw: 0.4, pitch: -0.2 }, { yaw: 1, pitch: 1 }, 0, 1)).toEqual({
        yaw: expect.closeTo(0.4),
        pitch: -0.2,
      });
      expect(smoothLookAngles({ yaw: 0.4, pitch: -0.2 }, { yaw: 1, pitch: 1 }, 18, 0)).toEqual({
        yaw: expect.closeTo(0.4),
        pitch: -0.2,
      });
      const result = smoothLookAngles({ yaw: 0, pitch: 0 }, { yaw: 1, pitch: 1 }, 18, 1);

      expect(result.yaw).toBeGreaterThan(0);
      expect(result.yaw).toBeLessThanOrEqual(1);
      expect(result.pitch).toBeGreaterThan(0);
      expect(result.pitch).toBeLessThanOrEqual(1);
    });

    it.each([
      [{ yaw: Number.NaN, pitch: 0 }, { yaw: 0, pitch: 0 }, 1, 1],
      [{ yaw: 0, pitch: 0 }, { yaw: Number.POSITIVE_INFINITY, pitch: 0 }, 1, 1],
      [{ yaw: 0, pitch: 0 }, { yaw: 0, pitch: 0 }, -1, 1],
      [{ yaw: 0, pitch: 0 }, { yaw: 0, pitch: 0 }, 1, Number.NaN],
      [{ yaw: 0, pitch: 0 }, { yaw: 0, pitch: 0 }, Number.MAX_VALUE, 2],
    ])('rejects invalid smoothing input %#', (current, target, response, delta) => {
      expect(() => smoothLookAngles(current, target, response, delta)).toThrow(RangeError);
    });

    it('rejects invalid angular-rate caps', () => {
      expect(() =>
        smoothLookAngles({ yaw: 0, pitch: 0 }, { yaw: 1, pitch: 1 }, 18, 1 / 120, -1, 1),
      ).toThrow(RangeError);
      expect(() =>
        smoothLookAngles(
          { yaw: 0, pitch: 0 },
          { yaw: 1, pitch: 1 },
          18,
          1 / 120,
          1,
          Number.POSITIVE_INFINITY,
        ),
      ).toThrow(RangeError);
    });
  });
});

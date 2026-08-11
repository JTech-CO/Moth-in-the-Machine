import { describe, expect, it } from 'vitest';

import { deriveMoveAxes, toggleFlightMode, updateLookAngles } from '@/utils/playerControls';

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
    it('applies mouse movement using the configured sensitivity', () => {
      expect(updateLookAngles({ yaw: 0.25, pitch: -0.1 }, 10, -4, 0.01, 1)).toEqual({
        yaw: 0.35,
        pitch: -0.060000000000000005,
      });
    });

    it('clamps pitch symmetrically while leaving yaw free', () => {
      expect(updateLookAngles({ yaw: 0, pitch: 0 }, 2, -100, 0.1, 0.75)).toEqual({
        yaw: 0.2,
        pitch: 0.75,
      });
      expect(updateLookAngles({ yaw: 0, pitch: 0 }, -2, 100, 0.1, 0.75)).toEqual({
        yaw: -0.2,
        pitch: -0.75,
      });
    });

    it('supports zero sensitivity and a zero pitch limit', () => {
      expect(updateLookAngles({ yaw: 0.4, pitch: 0.3 }, 20, -20, 0, 0)).toEqual({
        yaw: 0.4,
        pitch: 0,
      });
    });

    it.each([
      { current: { yaw: Number.NaN, pitch: 0 }, dx: 0, dy: 0, sensitivity: 1, limit: 1 },
      {
        current: { yaw: 0, pitch: Number.POSITIVE_INFINITY },
        dx: 0,
        dy: 0,
        sensitivity: 1,
        limit: 1,
      },
      { current: { yaw: 0, pitch: 0 }, dx: Number.NaN, dy: 0, sensitivity: 1, limit: 1 },
      {
        current: { yaw: 0, pitch: 0 },
        dx: 0,
        dy: Number.NEGATIVE_INFINITY,
        sensitivity: 1,
        limit: 1,
      },
      {
        current: { yaw: 0, pitch: 0 },
        dx: 0,
        dy: 0,
        sensitivity: Number.POSITIVE_INFINITY,
        limit: 1,
      },
      { current: { yaw: 0, pitch: 0 }, dx: 0, dy: 0, sensitivity: -0.01, limit: 1 },
      {
        current: { yaw: 0, pitch: 0 },
        dx: 0,
        dy: 0,
        sensitivity: 1,
        limit: Number.NaN,
      },
      { current: { yaw: 0, pitch: 0 }, dx: 0, dy: 0, sensitivity: 1, limit: -1 },
    ])('rejects invalid look input %#', ({ current, dx, dy, sensitivity, limit }) => {
      expect(() => updateLookAngles(current, dx, dy, sensitivity, limit)).toThrow(RangeError);
    });

    it('rejects arithmetic overflow instead of returning infinite angles', () => {
      expect(() =>
        updateLookAngles({ yaw: Number.MAX_VALUE, pitch: 0 }, Number.MAX_VALUE, 0, 2, 1),
      ).toThrow(RangeError);
      expect(() =>
        updateLookAngles({ yaw: 0, pitch: Number.MAX_VALUE }, 0, -Number.MAX_VALUE, 2, 1),
      ).toThrow(RangeError);
    });
  });
});

import { describe, expect, it } from 'vitest';

import {
  applyDamage,
  applyDamageRate,
  applyHealthDelta,
  clampHealth,
  isHealthDepleted,
  MAX_HEALTH,
  MIN_HEALTH,
} from '@/utils/health';
import { calculateStars } from '@/utils/starCalculator';

function applyDamageForFrames(damagePerSecond: number, seconds: number, fps: number): number {
  let health = MAX_HEALTH;

  for (let frame = 0; frame < seconds * fps; frame += 1) {
    health = applyDamageRate(health, damagePerSecond, 1 / fps);
  }

  return health;
}

describe('health utilities', () => {
  it.each([
    { health: -20, expected: MIN_HEALTH },
    { health: -0, expected: MIN_HEALTH },
    { health: 0, expected: MIN_HEALTH },
    { health: 25.5, expected: 25.5 },
    { health: 100, expected: MAX_HEALTH },
    { health: 140, expected: MAX_HEALTH },
  ])('clamps $health to $expected', ({ health, expected }) => {
    const result = clampHealth(health);

    expect(result).toBe(expected);
    expect(Object.is(result, -0)).toBe(false);
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
    'rejects a non-finite clamp input: %s',
    (health) => {
      expect(() => clampHealth(health)).toThrow(RangeError);
    },
  );

  it('applies signed health deltas and clamps the result', () => {
    expect(applyHealthDelta(50, 12.5)).toBe(62.5);
    expect(applyHealthDelta(90, 50)).toBe(MAX_HEALTH);
    expect(applyHealthDelta(10, -50)).toBe(MIN_HEALTH);
  });

  it.each([-1, 101, Number.NaN, Number.POSITIVE_INFINITY])(
    'rejects invalid current health: %s',
    (health) => {
      expect(() => applyHealthDelta(health, 1)).toThrow(RangeError);
    },
  );

  it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
    'rejects a non-finite health delta: %s',
    (delta) => {
      expect(() => applyHealthDelta(50, delta)).toThrow(RangeError);
    },
  );

  it('applies non-negative damage without dropping below zero', () => {
    expect(applyDamage(100, 12.5)).toBe(87.5);
    expect(applyDamage(10, 50)).toBe(MIN_HEALTH);
    expect(applyDamage(10, 0)).toBe(10);
  });

  it.each([-0.01, Number.NaN, Number.POSITIVE_INFINITY])('rejects invalid damage: %s', (damage) => {
    expect(() => applyDamage(100, damage)).toThrow(RangeError);
  });

  it('applies deterministic damage over time', () => {
    expect(applyDamageRate(100, 10, 0.25)).toBe(97.5);
    expect(applyDamageRate(7, 10, 1)).toBe(MIN_HEALTH);
    expect(applyDamageRate(70, 0, 5)).toBe(70);
  });

  it.each([30, 60, 120])('keeps health thresholds stable at $fps fps', (fps) => {
    const halfHealth = applyDamageForFrames(10, 5, fps);
    const depletedHealth = applyDamageForFrames(100, 1, fps);

    expect(halfHealth).toBe(50);
    expect(calculateStars(halfHealth)).toBe(2);
    expect(depletedHealth).toBe(MIN_HEALTH);
    expect(isHealthDepleted(depletedHealth)).toBe(true);
  });

  it.each([
    { damagePerSecond: -1, deltaSeconds: 1 },
    { damagePerSecond: 1, deltaSeconds: -1 },
    { damagePerSecond: Number.NaN, deltaSeconds: 1 },
    { damagePerSecond: 1, deltaSeconds: Number.POSITIVE_INFINITY },
    { damagePerSecond: Number.MAX_VALUE, deltaSeconds: 2 },
  ])(
    'rejects invalid damage-rate input $damagePerSecond, $deltaSeconds',
    ({ damagePerSecond, deltaSeconds }) => {
      expect(() => applyDamageRate(100, damagePerSecond, deltaSeconds)).toThrow(RangeError);
    },
  );

  it('reports depletion only at zero health', () => {
    expect(isHealthDepleted(MIN_HEALTH)).toBe(true);
    expect(isHealthDepleted(0.001)).toBe(false);
    expect(isHealthDepleted(MAX_HEALTH)).toBe(false);
  });

  it.each([-1, 101, Number.NEGATIVE_INFINITY])(
    'rejects invalid health when checking depletion: %s',
    (health) => {
      expect(() => isHealthDepleted(health)).toThrow(RangeError);
    },
  );
});

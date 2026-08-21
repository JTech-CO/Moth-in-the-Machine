import { describe, expect, it } from 'vitest';

import {
  formatHudTime,
  getDamageFeedback,
  projectMinimapPoint,
  resolveHudStars,
  toDurationIso,
  type MinimapBounds,
} from '@/utils/hudMetrics';
import type { StarRating } from '@/utils/starCalculator';

const BOUNDS: MinimapBounds = {
  min: { x: -4, z: -26 },
  max: { x: 4, z: 4 },
};

describe('HUD time formatting', () => {
  it.each([
    { milliseconds: 0, expected: '00:00.0' },
    { milliseconds: 99, expected: '00:00.0' },
    { milliseconds: 100, expected: '00:00.1' },
    { milliseconds: 59_999, expected: '00:59.9' },
    { milliseconds: 60_000, expected: '01:00.0' },
    { milliseconds: 3_661_987, expected: '61:01.9' },
  ])('formats $milliseconds ms as $expected', ({ milliseconds, expected }) => {
    expect(formatHudTime(milliseconds)).toBe(expected);
  });

  it.each([-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, Number.MAX_SAFE_INTEGER + 1])(
    'rejects invalid HUD milliseconds: %s',
    (milliseconds) => {
      expect(() => formatHudTime(milliseconds)).toThrow(RangeError);
      expect(() => toDurationIso(milliseconds)).toThrow(RangeError);
    },
  );

  it.each([
    { milliseconds: 0, expected: 'PT0S' },
    { milliseconds: 100, expected: 'PT0.1S' },
    { milliseconds: 1_001, expected: 'PT1.001S' },
    { milliseconds: 61_230, expected: 'PT1M1.23S' },
    { milliseconds: 3_661_000, expected: 'PT1H1M1S' },
    { milliseconds: 90_061_005, expected: 'P1DT1H1M1.005S' },
  ])('creates the ISO duration $expected', ({ milliseconds, expected }) => {
    expect(toDurationIso(milliseconds)).toBe(expected);
  });
});

describe('projectMinimapPoint', () => {
  it('projects the corridor centre into the drawable centre', () => {
    expect(projectMinimapPoint({ x: 0, y: 1.5, z: -11 }, BOUNDS)).toEqual({
      xPercent: 50,
      yPercent: 50,
    });
  });

  it('places the corridor start at the top and the far end at the bottom', () => {
    expect(projectMinimapPoint({ x: -4, y: 0, z: 4 }, BOUNDS)).toEqual({
      xPercent: 8,
      yPercent: 8,
    });
    expect(projectMinimapPoint({ x: 4, y: 0, z: -26 }, BOUNDS)).toEqual({
      xPercent: 92,
      yPercent: 92,
    });
  });

  it('clamps off-map coordinates and supports custom padding', () => {
    expect(projectMinimapPoint({ x: 400, y: 0, z: 400 }, BOUNDS, 10)).toEqual({
      xPercent: 90,
      yPercent: 10,
    });
    expect(projectMinimapPoint({ x: -400, y: 0, z: -400 }, BOUNDS, 0)).toEqual({
      xPercent: 0,
      yPercent: 100,
    });
  });

  it.each([
    { point: { x: Number.NaN, y: 0, z: 0 }, bounds: BOUNDS, padding: 8 },
    { point: { x: 0, y: Number.POSITIVE_INFINITY, z: 0 }, bounds: BOUNDS, padding: 8 },
    { point: { x: 0, y: 0, z: Number.NEGATIVE_INFINITY }, bounds: BOUNDS, padding: 8 },
    {
      point: { x: 0, y: 0, z: 0 },
      bounds: { min: { x: Number.NaN, z: -1 }, max: { x: 1, z: 1 } },
      padding: 8,
    },
    {
      point: { x: 0, y: 0, z: 0 },
      bounds: { min: { x: -1, z: Number.NaN }, max: { x: 1, z: 1 } },
      padding: 8,
    },
    {
      point: { x: 0, y: 0, z: 0 },
      bounds: { min: { x: -1, z: -1 }, max: { x: Number.NaN, z: 1 } },
      padding: 8,
    },
    {
      point: { x: 0, y: 0, z: 0 },
      bounds: { min: { x: -1, z: -1 }, max: { x: 1, z: Number.NaN } },
      padding: 8,
    },
    { point: { x: 0, y: 0, z: 0 }, bounds: BOUNDS, padding: Number.NaN },
  ])('rejects non-finite minimap input %#', ({ point, bounds, padding }) => {
    expect(() => projectMinimapPoint(point, bounds, padding)).toThrow(RangeError);
  });

  it.each([
    { bounds: { min: { x: 1, z: -1 }, max: { x: 1, z: 1 } }, padding: 8 },
    { bounds: { min: { x: -1, z: 2 }, max: { x: 1, z: 1 } }, padding: 8 },
    { bounds: BOUNDS, padding: -0.01 },
    { bounds: BOUNDS, padding: 50 },
  ])('rejects invalid minimap bounds or padding %#', ({ bounds, padding }) => {
    expect(() => projectMinimapPoint({ x: 0, y: 0, z: 0 }, bounds, padding)).toThrow(RangeError);
  });
});

describe('getDamageFeedback', () => {
  it('returns null when health is unchanged or restored', () => {
    expect(getDamageFeedback(75, 75)).toBeNull();
    expect(getDamageFeedback(75, 90)).toBeNull();
  });

  it('reports exact damage and increases severity up to its cap', () => {
    const small = getDamageFeedback(100, 99);
    const medium = getDamageFeedback(100, 75);
    const large = getDamageFeedback(100, 60);
    const lethal = getDamageFeedback(100, 0);

    expect(small?.amount).toBe(1);
    expect(small?.severity).toBeCloseTo(0.196);
    expect(medium?.amount).toBe(25);
    expect(medium?.severity).toBeGreaterThan(small?.severity ?? 0);
    expect(large?.amount).toBe(40);
    expect(large?.severity).toBeCloseTo(0.82);
    expect(lethal?.amount).toBe(100);
    expect(lethal?.severity).toBeCloseTo(0.82);
  });

  it.each([
    { previousHealth: -1, currentHealth: 0 },
    { previousHealth: 101, currentHealth: 100 },
    { previousHealth: Number.NaN, currentHealth: 100 },
    { previousHealth: 100, currentHealth: -1 },
    { previousHealth: 100, currentHealth: 101 },
    { previousHealth: 100, currentHealth: Number.POSITIVE_INFINITY },
  ])('rejects invalid health input %#', ({ previousHealth, currentHealth }) => {
    expect(() => getDamageFeedback(previousHealth, currentHealth)).toThrow(RangeError);
  });
});

describe('resolveHudStars', () => {
  it.each([
    { health: 0, expected: 0 },
    { health: 25, expected: 1 },
    { health: 50, expected: 2 },
    { health: 100, expected: 3 },
  ] as const)('derives $expected stars from $health HP', ({ health, expected }) => {
    expect(resolveHudStars(health)).toBe(expected);
    expect(resolveHudStars(health, null)).toBe(expected);
  });

  it.each([0, 1, 2, 3] as const)('uses the final rating %s when supplied', (finalStars) => {
    expect(resolveHudStars(100, finalStars)).toBe(finalStars);
  });

  it.each([-1, 1.5, 4, Number.NaN])('rejects an invalid final rating: %s', (finalStars) => {
    expect(() => resolveHudStars(100, finalStars as StarRating)).toThrow(RangeError);
  });

  it('delegates invalid live health validation to calculateStars', () => {
    expect(() => resolveHudStars(-1)).toThrow(RangeError);
    expect(() => resolveHudStars(Number.POSITIVE_INFINITY, null)).toThrow(RangeError);
  });
});

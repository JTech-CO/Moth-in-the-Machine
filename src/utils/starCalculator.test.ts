import { describe, expect, it } from 'vitest';

import { calculateStars } from '@/utils/starCalculator';

describe('calculateStars', () => {
  it.each([
    { remainingHealth: 0, expected: 0 },
    { remainingHealth: Number.MIN_VALUE, expected: 1 },
    { remainingHealth: 49.999, expected: 1 },
    { remainingHealth: 50, expected: 2 },
    { remainingHealth: 99.999, expected: 2 },
    { remainingHealth: 100, expected: 3 },
  ] as const)(
    'returns $expected stars for $remainingHealth HP',
    ({ remainingHealth, expected }) => {
      expect(calculateStars(remainingHealth)).toBe(expected);
    },
  );

  it.each([-0.001, 100.001, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
    'rejects invalid remaining health: %s',
    (remainingHealth) => {
      expect(() => calculateStars(remainingHealth)).toThrow(RangeError);
    },
  );
});

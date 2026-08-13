import { describe, expect, it } from 'vitest';

import { getMenuCorridorEnvironment } from '@/components/three/menuCorridorEnvironment';

describe('menu corridor environment', () => {
  it.each([
    [null, 'relay-bay'],
    ['tutorial', 'relay-bay'],
    ['easy', 'relay-bay'],
    ['normal', 'switching-gallery'],
    ['hard', 'logic-labyrinth'],
  ] as const)('maps %s selection to %s', (difficulty, environment) => {
    expect(getMenuCorridorEnvironment(difficulty)).toBe(environment);
  });
});

import { describe, expect, it } from 'vitest';

import { getCorridorLighting } from '@/utils/corridorLighting';
import { selectForRenderQuality } from '@/utils/renderQuality';

describe('low-spec corridor lighting', () => {
  it('keeps the first, alternating, and final details when reducing collections', () => {
    expect(selectForRenderQuality(['a', 'b', 'c', 'd'], 'low')).toEqual(['a', 'c', 'd']);
    expect(selectForRenderQuality(['a', 'b', 'c', 'd', 'e'], 'low')).toEqual(['a', 'c', 'e']);
    expect(selectForRenderQuality(['a', 'b'], 'low')).toEqual(['a', 'b']);
  });

  it('keeps reduced guide lights overlapping across the full playable corridor', () => {
    for (const environment of ['switching-gallery', 'logic-labyrinth'] as const) {
      const allFixtures = getCorridorLighting(environment).fixtures;
      const fixtures = selectForRenderQuality(allFixtures, 'low');

      expect(fixtures.at(0)).toBe(allFixtures.at(0));
      expect(fixtures.at(-1)).toBe(allFixtures.at(-1));
      expect(fixtures.length).toBeLessThan(allFixtures.length);

      for (let z = 3.5; z >= -27; z -= 0.25) {
        expect(fixtures.some((light) => Math.abs(light.position[2] - z) <= light.distance)).toBe(
          true,
        );
      }
    }
  });
});

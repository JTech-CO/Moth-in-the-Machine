import { describe, expect, it } from 'vitest';

import { CORRIDOR_LIGHTING, getCorridorLighting } from '@/utils/corridorLighting';

describe('corridor lighting', () => {
  it('preserves the relay bay lighting and limits the harder corridor budgets', () => {
    expect(getCorridorLighting('relay-bay')).toEqual({ fill: null, fixtures: [] });
    expect(getCorridorLighting('switching-gallery').fixtures).toHaveLength(4);
    expect(getCorridorLighting('logic-labyrinth').fixtures).toHaveLength(5);
  });

  it('uses a restrained fill light to prevent absolute black regions', () => {
    for (const environment of ['switching-gallery', 'logic-labyrinth'] as const) {
      const fill = getCorridorLighting(environment).fill;

      expect(fill).not.toBeNull();
      expect(fill?.intensity).toBeGreaterThanOrEqual(0.4);
      expect(fill?.intensity).toBeLessThanOrEqual(0.55);
    }
  });

  it('defines finite, unique, shadow-free fixtures within the performance budget', () => {
    for (const lighting of Object.values(CORRIDOR_LIGHTING)) {
      const ids = new Set<string>();

      expect(Object.isFrozen(lighting)).toBe(true);
      expect(Object.isFrozen(lighting.fixtures)).toBe(true);
      expect(lighting.fixtures.length).toBeLessThanOrEqual(5);

      for (const light of lighting.fixtures) {
        expect(ids.has(light.id)).toBe(false);
        ids.add(light.id);
        expect(Object.isFrozen(light)).toBe(true);
        expect(Object.isFrozen(light.position)).toBe(true);
        expect(light.position.every(Number.isFinite)).toBe(true);
        expect(Number.isFinite(light.intensity)).toBe(true);
        expect(light.intensity).toBeGreaterThan(0);
        expect(light.intensity).toBeLessThanOrEqual(5.5);
        expect(light.distance).toBeGreaterThanOrEqual(8);
        expect(light.distance).toBeLessThanOrEqual(10);
        expect(light.decay).toBe(2);
        expect(light.castsShadow).toBe(false);
      }
    }
  });

  it('overlaps fixture ranges along the full playable corridor', () => {
    for (const environment of ['switching-gallery', 'logic-labyrinth'] as const) {
      const fixtures = getCorridorLighting(environment).fixtures;

      for (let z = 3.5; z >= -27; z -= 0.25) {
        expect(fixtures.some((light) => Math.abs(light.position[2] - z) <= light.distance)).toBe(
          true,
        );
      }
    }
  });
});

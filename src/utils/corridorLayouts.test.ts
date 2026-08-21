import { describe, expect, it } from 'vitest';

import {
  CORRIDOR_LAYOUTS,
  findBlockingStructures,
  getCorridorLayout,
  type CorridorEnvironmentId,
} from '@/utils/corridorLayouts';

const PLAYER_HALF_EXTENTS = { x: 0.38, y: 0.16, z: 0.34 };

describe('corridor layouts', () => {
  it('defines three distinct environments with increasing structural complexity', () => {
    expect(Object.keys(CORRIDOR_LAYOUTS)).toEqual([
      'relay-bay',
      'switching-gallery',
      'logic-labyrinth',
    ]);
    expect(getCorridorLayout('relay-bay').structures).toHaveLength(0);
    expect(getCorridorLayout('switching-gallery').structures).toHaveLength(6);
    expect(getCorridorLayout('logic-labyrinth').structures).toHaveLength(7);
  });

  it('keeps every structure finite, ordered, unique, and frozen', () => {
    for (const layout of Object.values(CORRIDOR_LAYOUTS)) {
      const ids = new Set<string>();

      expect(Object.isFrozen(layout)).toBe(true);
      expect(Object.isFrozen(layout.structures)).toBe(true);

      for (const structure of layout.structures) {
        expect(ids.has(structure.id)).toBe(false);
        ids.add(structure.id);
        expect(Object.isFrozen(structure)).toBe(true);
        expect(Object.isFrozen(structure.collider)).toBe(true);

        for (const axis of ['x', 'y', 'z'] as const) {
          expect(Number.isFinite(structure.collider.min[axis])).toBe(true);
          expect(Number.isFinite(structure.collider.max[axis])).toBe(true);
          expect(structure.collider.min[axis]).toBeLessThan(structure.collider.max[axis]);
        }
      }
    }
  });

  it('leaves the canonical spawn clear in every environment', () => {
    for (const environment of Object.keys(CORRIDOR_LAYOUTS) as CorridorEnvironmentId[]) {
      expect(
        findBlockingStructures(environment, { x: 0, y: -0.25, z: 3.55 }, PLAYER_HALF_EXTENTS),
      ).toEqual([]);
    }
  });

  it('forces alternating routes in the normal switching gallery', () => {
    expect(
      findBlockingStructures('switching-gallery', { x: -2, y: 0, z: -4 }, PLAYER_HALF_EXTENTS),
    ).toContain('normal-gate-left-a');
    expect(
      findBlockingStructures('switching-gallery', { x: 2, y: 0, z: -4 }, PLAYER_HALF_EXTENTS),
    ).toEqual([]);
    expect(
      findBlockingStructures('switching-gallery', { x: 2, y: 0, z: -9 }, PLAYER_HALF_EXTENTS),
    ).toContain('normal-gate-right-a');
  });

  it('forces vertical and lateral choices in the hard logic labyrinth', () => {
    expect(
      findBlockingStructures('logic-labyrinth', { x: 2, y: -1, z: -3.7 }, PLAYER_HALF_EXTENTS),
    ).toContain('hard-deck-floor-a');
    expect(
      findBlockingStructures('logic-labyrinth', { x: 2, y: 1.5, z: -3.7 }, PLAYER_HALF_EXTENTS),
    ).toEqual([]);
    expect(
      findBlockingStructures('logic-labyrinth', { x: -2, y: 0, z: -11.5 }, PLAYER_HALF_EXTENTS),
    ).toContain('hard-gate-left');
    expect(
      findBlockingStructures('logic-labyrinth', { x: 2, y: 0, z: -11.5 }, PLAYER_HALF_EXTENTS),
    ).toEqual([]);
  });

  it('rejects invalid collision inputs', () => {
    expect(() =>
      findBlockingStructures('relay-bay', { x: Number.NaN, y: 0, z: 0 }, PLAYER_HALF_EXTENTS),
    ).toThrow(RangeError);
    expect(() =>
      findBlockingStructures('relay-bay', { x: 0, y: 0, z: 0 }, { x: -1, y: 0, z: 0 }),
    ).toThrow(RangeError);
  });
});

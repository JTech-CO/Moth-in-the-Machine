import { describe, expect, it } from 'vitest';

import {
  CABINET_INSTANCE_COUNT,
  CAMERA_CONFIG,
  CANVAS_CONFIG,
  calculateAdaptiveDpr,
  CORRIDOR_SECTION_Z,
  createRelayGrid,
  FOG_CONFIG,
  getPerformanceBounds,
  PERFORMANCE_CONFIG,
  RAIL_INSTANCE_COUNT,
  RELAY_GRID,
  RELAY_INSTANCE_COUNT,
  SCENE_COLORS,
  VACUUM_TUBE_POSITIONS,
} from '@/components/three/sceneConfig';

describe('M4 scene configuration', () => {
  it('uses the documented 1947 laboratory design tokens', () => {
    expect(SCENE_COLORS).toMatchObject({
      background: '#0a0e17',
      fog: '#0a0e17',
      amber: '#f0c14b',
      brass: '#c9a227',
      metal: '#1c2526',
      metalLight: '#2a3439',
    });
  });

  it('locks the performance-conscious canvas and camera contract', () => {
    expect(CANVAS_CONFIG).toEqual({
      dpr: [1, 1.5],
      antialias: true,
      powerPreference: 'high-performance',
      toneMappingExposure: 0.92,
    });
    expect(CAMERA_CONFIG).toMatchObject({
      position: [0, -0.45, 10],
      target: [0, -0.55, -9],
      portraitPosition: [0, -0.65, 11],
      portraitTarget: [-4.05, -0.2, 0.4],
      portraitAspectMax: 0.72,
      fov: 55,
      near: 0.1,
      far: 80,
    });
    expect(FOG_CONFIG.near).toBeLessThan(FOG_CONFIG.far);
  });

  it('adapts DPR within the configured quality budget', () => {
    expect(PERFORMANCE_CONFIG).toMatchObject({
      factor: 1,
      step: 0.25,
      iterations: 5,
      sampleMs: 500,
      threshold: 0.6,
      bounds: [57, 61],
    });
    expect(getPerformanceBounds()).toEqual([57, 61]);
    expect(calculateAdaptiveDpr(1, 2)).toBe(1.5);
    expect(calculateAdaptiveDpr(0.5, 1.5)).toBe(1.25);
    expect(calculateAdaptiveDpr(0, 1.5)).toBe(1);
    expect(calculateAdaptiveDpr(1, 1)).toBe(1);
    expect(calculateAdaptiveDpr(-1, 1.5)).toBe(1);
    expect(calculateAdaptiveDpr(2, 1.5)).toBe(1.5);
    expect(calculateAdaptiveDpr(Number.NaN, 1.5)).toBe(1);
    expect(calculateAdaptiveDpr(1, Number.NaN)).toBe(1);
  });

  it('creates a centered, deterministic relay grid', () => {
    expect(createRelayGrid(3, 2, 2, 4)).toEqual([
      { x: -2, y: -2 },
      { x: 0, y: -2 },
      { x: 2, y: -2 },
      { x: -2, y: 2 },
      { x: 0, y: 2 },
      { x: 2, y: 2 },
    ]);
    expect(RELAY_GRID).toHaveLength(30);
    expect(RELAY_GRID[0]?.x).toBeCloseTo(-1.36);
    expect(RELAY_GRID[0]?.y).toBeCloseTo(-1.4);
    expect(RELAY_GRID.at(-1)?.x).toBeCloseTo(1.36);
    expect(RELAY_GRID.at(-1)?.y).toBeCloseTo(1.4);
  });

  it('keeps scene instance budgets and light positions deterministic', () => {
    expect(CORRIDOR_SECTION_Z).toEqual([1.5, -3.5, -8.5, -13.5, -18.5]);
    expect(CABINET_INSTANCE_COUNT).toBe(10);
    expect(RELAY_INSTANCE_COUNT).toBe(300);
    expect(RAIL_INSTANCE_COUNT).toBe(20);
    expect(VACUUM_TUBE_POSITIONS).toHaveLength(4);
    expect(new Set(VACUUM_TUBE_POSITIONS.map((position) => position.join(','))).size).toBe(4);
  });
});

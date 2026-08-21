import { describe, expect, it } from 'vitest';

import {
  CABINET_INSTANCE_COUNT,
  CAMERA_CONFIG,
  CAMERA_FOLLOW_CONFIG,
  CANVAS_CONFIG,
  calculateAdaptiveDpr,
  CORRIDOR_INTERIOR_BOUNDS,
  CORRIDOR_SECTION_Z,
  createRelayGrid,
  FOG_CONFIG,
  getPerformanceBounds,
  PERFORMANCE_CONFIG,
  PLAYER_CENTER_BOUNDS,
  PLAYER_CONFIG,
  RAIL_INSTANCE_COUNT,
  RELAY_GRID,
  RELAY_INSTANCE_COUNT,
  SCENE_COLORS,
  VACUUM_TUBE_POSITIONS,
} from '@/components/three/sceneConfig';
import { findBlockingStructures } from '@/utils/corridorLayouts';
import { createHazardRuntimeState, evaluateStageHazards } from '@/utils/stageHazards';
import { STAGE_DEFINITIONS } from '@/utils/stages';

describe('M6 scene configuration', () => {
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
  it('keeps player and follow-camera tuning finite and ordered', () => {
    const followValues = Object.values(CAMERA_FOLLOW_CONFIG);
    const playerValues = [
      ...PLAYER_CONFIG.spawn,
      ...PLAYER_CONFIG.halfExtents,
      PLAYER_CONFIG.acceleration,
      PLAYER_CONFIG.maximumSpeed,
      PLAYER_CONFIG.maximumVerticalSpeed,
      PLAYER_CONFIG.drag,
      PLAYER_CONFIG.hoverVerticalDamping,
      PLAYER_CONFIG.maximumDescentSpeed,
      PLAYER_CONFIG.landingVerticalResponse,
      PLAYER_CONFIG.fixedDelta,
      PLAYER_CONFIG.maximumFrameDelta,
      PLAYER_CONFIG.maximumSubsteps,
      PLAYER_CONFIG.diagnosticIntervalSeconds,
    ];

    expect(followValues.every(Number.isFinite)).toBe(true);
    expect(playerValues.every(Number.isFinite)).toBe(true);
    expect(CAMERA_FOLLOW_CONFIG.landscapeDistance).toBeGreaterThan(0);
    expect(CAMERA_FOLLOW_CONFIG.portraitDistance).toBeGreaterThan(0);
    expect(CAMERA_FOLLOW_CONFIG.positionDamping).toBeGreaterThan(0);
    expect(CAMERA_FOLLOW_CONFIG.targetDamping).toBeGreaterThan(0);
    expect(CAMERA_FOLLOW_CONFIG.minimumY).toBeLessThan(CAMERA_FOLLOW_CONFIG.maximumY);
    expect(CAMERA_FOLLOW_CONFIG.minimumZ).toBeLessThan(CAMERA_FOLLOW_CONFIG.maximumZ);
    expect(CAMERA_FOLLOW_CONFIG.maximumAbsX).toBeGreaterThan(0);
    expect(PLAYER_CONFIG.halfExtents.every((extent) => extent > 0)).toBe(true);
    expect(PLAYER_CONFIG.acceleration).toBeGreaterThan(0);
    expect(PLAYER_CONFIG.maximumSpeed).toBeGreaterThan(0);
    expect(PLAYER_CONFIG.maximumVerticalSpeed).toBeGreaterThanOrEqual(
      PLAYER_CONFIG.maximumDescentSpeed,
    );
    expect(PLAYER_CONFIG.fixedDelta).toBeGreaterThan(0);
    expect(PLAYER_CONFIG.fixedDelta).toBeLessThan(PLAYER_CONFIG.maximumFrameDelta);
    expect(Number.isSafeInteger(PLAYER_CONFIG.maximumSubsteps)).toBe(true);
    expect(PLAYER_CONFIG.maximumSubsteps).toBeGreaterThan(0);
  });

  it('keeps finite player bounds ordered with the spawn inside them', () => {
    const spawnByAxis = {
      x: PLAYER_CONFIG.spawn[0],
      y: PLAYER_CONFIG.spawn[1],
      z: PLAYER_CONFIG.spawn[2],
    };

    for (const axis of ['x', 'y', 'z'] as const) {
      const minimum = PLAYER_CENTER_BOUNDS.min[axis];
      const maximum = PLAYER_CENTER_BOUNDS.max[axis];
      const spawn = spawnByAxis[axis];

      expect([minimum, maximum, spawn].every(Number.isFinite)).toBe(true);
      expect(minimum).toBeLessThan(maximum);
      expect(spawn).toBeGreaterThanOrEqual(minimum);
      expect(spawn).toBeLessThanOrEqual(maximum);
    }

    expect(PLAYER_CENTER_BOUNDS.min.x).toBe(
      CORRIDOR_INTERIOR_BOUNDS.min.x + PLAYER_CONFIG.halfExtents[0],
    );
    expect(PLAYER_CENTER_BOUNDS.min.y).toBe(
      CORRIDOR_INTERIOR_BOUNDS.min.y + PLAYER_CONFIG.halfExtents[1],
    );
    expect(PLAYER_CENTER_BOUNDS.min.z).toBe(
      CORRIDOR_INTERIOR_BOUNDS.min.z + PLAYER_CONFIG.halfExtents[2],
    );
    expect(PLAYER_CENTER_BOUNDS.max.x).toBe(
      CORRIDOR_INTERIOR_BOUNDS.max.x - PLAYER_CONFIG.halfExtents[0],
    );
    expect(PLAYER_CENTER_BOUNDS.max.y).toBe(
      CORRIDOR_INTERIOR_BOUNDS.max.y - PLAYER_CONFIG.halfExtents[1],
    );
    expect(PLAYER_CENTER_BOUNDS.max.z).toBe(
      CORRIDOR_INTERIOR_BOUNDS.max.z - PLAYER_CONFIG.halfExtents[2],
    );
  });

  it('keeps every M6 spawn and target landable inside the player bounds', () => {
    const playerHalfExtents = {
      x: PLAYER_CONFIG.halfExtents[0],
      y: PLAYER_CONFIG.halfExtents[1],
      z: PLAYER_CONFIG.halfExtents[2],
    };

    for (const stage of STAGE_DEFINITIONS) {
      expect(stage.spawnPosition).toEqual({
        x: PLAYER_CONFIG.spawn[0],
        y: PLAYER_CONFIG.spawn[1],
        z: PLAYER_CONFIG.spawn[2],
      });
      const targetAxis =
        stage.target.surface === 'floor' || stage.target.surface === 'ceiling' ? 'y' : 'x';
      const expectedBoundary =
        stage.target.surface === 'floor' || stage.target.surface === 'left-wall'
          ? PLAYER_CENTER_BOUNDS.min[targetAxis]
          : PLAYER_CENTER_BOUNDS.max[targetAxis];

      expect(stage.target.position[targetAxis]).toBeCloseTo(expectedBoundary);
      expect(stage.targetPosition).toBe(stage.target.position);
      expect(stage.targetSurface).toBe(stage.target.surface);

      for (const point of [stage.spawnPosition, stage.target.position]) {
        for (const axis of ['x', 'y', 'z'] as const) {
          expect(point[axis]).toBeGreaterThanOrEqual(PLAYER_CENTER_BOUNDS.min[axis]);
          expect(point[axis]).toBeLessThanOrEqual(PLAYER_CENTER_BOUNDS.max[axis]);
        }
      }

      for (const point of [stage.spawnPosition, stage.target.position]) {
        const evaluation = evaluateStageHazards(
          stage.obstacles,
          point,
          playerHalfExtents,
          PLAYER_CONFIG.fixedDelta,
          createHazardRuntimeState(),
        );

        expect(evaluation.damage).toBe(0);
        expect(evaluation.blockingObstacleIds).toEqual([]);
      }

      expect(
        findBlockingStructures(stage.environment, stage.spawnPosition, playerHalfExtents),
      ).toEqual([]);
      expect(
        findBlockingStructures(stage.environment, stage.target.position, playerHalfExtents),
      ).toEqual([]);
    }
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

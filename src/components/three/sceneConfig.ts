import type { RenderQuality } from '@/utils/renderQuality';

export const SCENE_COLORS = {
  background: '#0a0e17',
  fog: '#0a0e17',
  amber: '#f0c14b',
  brass: '#c9a227',
  cream: '#e8e4d9',
  metal: '#1c2526',
  metalLight: '#2a3439',
  bakelite: '#211512',
  floor: '#11181d',
} as const;

export type SceneVector = readonly [number, number, number];

export interface SceneBounds {
  readonly min: {
    readonly x: number;
    readonly y: number;
    readonly z: number;
  };
  readonly max: {
    readonly x: number;
    readonly y: number;
    readonly z: number;
  };
}

export interface RelayPosition {
  readonly x: number;
  readonly y: number;
}

export const CAMERA_CONFIG = {
  position: [0, -0.45, 10] as SceneVector,
  target: [0, -0.55, -9] as SceneVector,
  portraitPosition: [0, -0.65, 11] as SceneVector,
  portraitTarget: [-4.05, -0.2, 0.4] as SceneVector,
  portraitAspectMax: 0.72,
  fov: 55,
  near: 0.1,
  far: 80,
  idleSway: 0.12,
} as const;

export const CAMERA_FOLLOW_CONFIG = {
  landscapeDistance: 3.2,
  portraitDistance: 4,
  height: 0.82,
  lookAhead: 1.65,
  positionDamping: 6.5,
  targetDamping: 9,
  maximumDampingDelta: 0.05,
  minimumY: -1.88,
  maximumY: 2.48,
  maximumAbsX: 3.68,
  minimumZ: -26.35,
  maximumZ: 7.5,
} as const;

export const PLAYER_CONFIG = {
  spawn: [0, -0.25, 3.55] as SceneVector,
  halfExtents: [0.38, 0.16, 0.34] as SceneVector,
  acceleration: 10,
  maximumSpeed: 4.2,
  maximumVerticalSpeed: 3.2,
  drag: 3.2,
  hoverVerticalDamping: 5.5,
  maximumDescentSpeed: 2,
  landingVerticalResponse: 5,
  fixedDelta: 1 / 120,
  maximumFrameDelta: 0.1,
  maximumSubsteps: 8,
  diagnosticIntervalSeconds: 0.75,
} as const;

export const CORRIDOR_INTERIOR_BOUNDS: SceneBounds = {
  min: { x: -4.03, y: -2.21, z: -26.82 },
  max: { x: 4.03, y: 2.71, z: 4.99 },
};

const [playerHalfX, playerHalfY, playerHalfZ] = PLAYER_CONFIG.halfExtents;

// Minkowski-insetting the visible shell by the moth AABB prevents its geometry crossing a wall.
export const PLAYER_CENTER_BOUNDS: SceneBounds = {
  min: {
    x: CORRIDOR_INTERIOR_BOUNDS.min.x + playerHalfX,
    y: CORRIDOR_INTERIOR_BOUNDS.min.y + playerHalfY,
    z: CORRIDOR_INTERIOR_BOUNDS.min.z + playerHalfZ,
  },
  max: {
    x: CORRIDOR_INTERIOR_BOUNDS.max.x - playerHalfX,
    y: CORRIDOR_INTERIOR_BOUNDS.max.y - playerHalfY,
    z: CORRIDOR_INTERIOR_BOUNDS.max.z - playerHalfZ,
  },
};

export const CANVAS_CONFIG = {
  dpr: [1, 1.5] as const,
  antialias: true,
  powerPreference: 'high-performance' as const,
  toneMappingExposure: 0.92,
} as const;

export const LOW_SPEC_CANVAS_CONFIG = {
  dpr: [0.75, 1] as const,
  antialias: false,
  powerPreference: 'high-performance' as const,
  toneMappingExposure: 0.92,
} as const;

export const PERFORMANCE_CONFIG = {
  factor: 1,
  step: 0.25,
  iterations: 5,
  sampleMs: 500,
  threshold: 0.6,
  bounds: [57, 61] as const,
} as const;

export const LOW_SPEC_PERFORMANCE_BOUNDS = [28, 32] as const;

export function getCanvasConfig(renderQuality: RenderQuality) {
  return renderQuality === 'low' ? LOW_SPEC_CANVAS_CONFIG : CANVAS_CONFIG;
}

export function calculateAdaptiveDpr(
  factor: number,
  initialDpr: number,
  renderQuality: RenderQuality = 'auto',
): number {
  const normalizedFactor = Number.isFinite(factor) ? Math.min(1, Math.max(0, factor)) : 0;
  const [minimumDpr, maximumDpr] = getCanvasConfig(renderQuality).dpr;
  const normalizedInitialDpr = Number.isFinite(initialDpr)
    ? Math.min(maximumDpr, Math.max(minimumDpr, initialDpr))
    : minimumDpr;
  const targetDpr = minimumDpr + (normalizedInitialDpr - minimumDpr) * normalizedFactor;

  return Math.round(targetDpr * 100) / 100;
}

export function getPerformanceBounds(
  renderQuality: RenderQuality = 'auto',
): [lower: number, upper: number] {
  const bounds = renderQuality === 'low' ? LOW_SPEC_PERFORMANCE_BOUNDS : PERFORMANCE_CONFIG.bounds;

  return [bounds[0], bounds[1]];
}

export const FOG_CONFIG = {
  near: 12,
  far: 42,
} as const;

export const CORRIDOR_SECTION_Z = [1.5, -3.5, -8.5, -13.5, -18.5] as const;

export const VACUUM_TUBE_POSITIONS = [
  [-3.92, 0.9, 2.7],
  [3.92, 1.15, -1],
  [-3.92, 0.35, -7.8],
  [3.92, 0.72, -12.6],
] as const satisfies readonly SceneVector[];

export function createRelayGrid(
  columns: number,
  rows: number,
  horizontalSpacing: number,
  verticalSpacing: number,
): readonly RelayPosition[] {
  const xOffset = ((columns - 1) * horizontalSpacing) / 2;
  const yOffset = ((rows - 1) * verticalSpacing) / 2;

  return Array.from({ length: columns * rows }, (_, index) => ({
    x: (index % columns) * horizontalSpacing - xOffset,
    y: Math.floor(index / columns) * verticalSpacing - yOffset,
  }));
}

export const RELAY_GRID = createRelayGrid(5, 6, 0.68, 0.56);
export const CABINET_INSTANCE_COUNT = CORRIDOR_SECTION_Z.length * 2;
export const RELAY_INSTANCE_COUNT = CABINET_INSTANCE_COUNT * RELAY_GRID.length;
export const RAIL_INSTANCE_COUNT = CABINET_INSTANCE_COUNT * 2;

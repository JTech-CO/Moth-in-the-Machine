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

export const CANVAS_CONFIG = {
  dpr: [1, 1.5] as const,
  antialias: true,
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

export function calculateAdaptiveDpr(factor: number, initialDpr: number): number {
  const normalizedFactor = Number.isFinite(factor) ? Math.min(1, Math.max(0, factor)) : 0;
  const [minimumDpr, maximumDpr] = CANVAS_CONFIG.dpr;
  const normalizedInitialDpr = Number.isFinite(initialDpr)
    ? Math.min(maximumDpr, Math.max(minimumDpr, initialDpr))
    : minimumDpr;
  const targetDpr = minimumDpr + (normalizedInitialDpr - minimumDpr) * normalizedFactor;

  return Math.round(targetDpr * 100) / 100;
}

export function getPerformanceBounds(): [lower: number, upper: number] {
  return [PERFORMANCE_CONFIG.bounds[0], PERFORMANCE_CONFIG.bounds[1]];
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

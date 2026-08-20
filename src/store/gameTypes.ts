import type { StarRating } from '@/utils/starCalculator';
import type { Vec3 } from '@/utils/collision';
import { DEFAULT_RENDER_QUALITY, type RenderQuality } from '@/utils/renderQuality';

export type CompletedStarRating = Exclude<StarRating, 0>;
export type SessionStatus = 'idle' | 'playing' | 'paused' | 'cleared' | 'failed';

export interface PlayerState {
  readonly health: number;
  readonly position: Vec3;
  readonly velocity: Vec3;
  readonly isLanded: boolean;
}

export interface GameResult {
  readonly stageId: number;
  readonly timeMs: number;
  readonly remainingHealth: number;
  readonly stars: StarRating;
  readonly timestamp: Date;
}

export interface StageProgress {
  readonly stageId: number;
  readonly bestTimeMs: number;
  readonly bestStars: CompletedStarRating;
}

export interface GameProgress {
  readonly completedStages: readonly StageProgress[];
  readonly totalStars: number;
}

export interface GameSettings {
  readonly showControlHints: boolean;
  readonly renderQuality: RenderQuality;
}

export function createDefaultPlayerState(position: Vec3 = { x: 0, y: 0, z: 0 }): PlayerState {
  return {
    health: 100,
    position: { ...position },
    velocity: { x: 0, y: 0, z: 0 },
    isLanded: false,
  };
}

export function createDefaultProgress(): GameProgress {
  return {
    completedStages: [],
    totalStars: 0,
  };
}

export function createDefaultSettings(): GameSettings {
  return {
    showControlHints: true,
    renderQuality: DEFAULT_RENDER_QUALITY,
  };
}

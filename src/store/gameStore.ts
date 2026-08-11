import { createStore, type StoreApi } from 'zustand/vanilla';

import {
  createDefaultPlayerState,
  type CompletedStarRating,
  type GameProgress,
  type GameResult,
  type GameSettings,
  type PlayerState,
  type SessionStatus,
  type StageProgress,
} from '@/store/gameTypes';
import {
  loadPersistentGame,
  savePersistentGame,
  type GameStorage,
  type PersistenceLoadStatus,
  type SaveProgressResult,
} from '@/store/persistence';
import { applyHealthDelta, isHealthDepleted } from '@/utils/health';
import { calculateStars, type StarRating } from '@/utils/starCalculator';
import type { Vec3 } from '@/utils/collision';

export interface GameStoreState {
  readonly player: PlayerState;
  readonly currentStageId: number | null;
  readonly elapsedTimeMs: number;
  readonly status: SessionStatus;
  readonly stars: StarRating;
  readonly result: GameResult | null;
  readonly progress: GameProgress;
  readonly settings: GameSettings;
  readonly persistenceStatus: PersistenceLoadStatus;
  startStage(stageId: number): void;
  setPlayerSnapshot(position: Vec3, velocity: Vec3): void;
  setElapsedTimeMs(elapsedTimeMs: number): void;
  updateHealth(delta: number): void;
  land(success: boolean): GameResult | null;
  updateSettings(patch: Partial<GameSettings>): void;
  saveProgress(): SaveProgressResult;
}

export interface GameStoreDependencies {
  readonly storage?: GameStorage | null;
  readonly now?: () => Date;
}

export type GameStoreApi = StoreApi<GameStoreState>;

function assertPositiveSafeInteger(value: number, label: string): void {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new RangeError(label + ' must be a positive safe integer.');
  }
}

function assertNonNegativeSafeInteger(value: number, label: string): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(label + ' must be a non-negative safe integer.');
  }
}

function assertVector(vector: Vec3, label: string): void {
  if (!Number.isFinite(vector.x) || !Number.isFinite(vector.y) || !Number.isFinite(vector.z)) {
    throw new RangeError(label + ' must contain only finite coordinates.');
  }
}

function copyVector(vector: Vec3): Vec3 {
  return {
    x: vector.x,
    y: vector.y,
    z: vector.z,
  };
}

function readTimestamp(now: () => Date): Date {
  const timestamp = now();

  if (!(timestamp instanceof Date) || !Number.isFinite(timestamp.getTime())) {
    throw new RangeError('now must return a valid Date.');
  }

  return new Date(timestamp.getTime());
}

function calculateTotalStars(completedStages: readonly StageProgress[]): number {
  return completedStages.reduce((total, stage) => total + stage.bestStars, 0);
}

function mergeProgress(
  progress: GameProgress,
  stageId: number,
  bestTimeMs: number,
  bestStars: CompletedStarRating,
): GameProgress {
  const existingStage = progress.completedStages.find((stage) => stage.stageId === stageId);
  const mergedStage: StageProgress =
    existingStage === undefined
      ? {
          stageId,
          bestTimeMs,
          bestStars,
        }
      : {
          stageId,
          bestTimeMs: Math.min(existingStage.bestTimeMs, bestTimeMs),
          bestStars: Math.max(existingStage.bestStars, bestStars) as CompletedStarRating,
        };

  const completedStages = [
    ...progress.completedStages.filter((stage) => stage.stageId !== stageId),
    mergedStage,
  ].sort((first, second) => first.stageId - second.stageId);

  return {
    completedStages,
    totalStars: calculateTotalStars(completedStages),
  };
}

function createResult(
  stageId: number,
  elapsedTimeMs: number,
  remainingHealth: number,
  stars: StarRating,
  now: () => Date,
): GameResult {
  return {
    stageId,
    timeMs: elapsedTimeMs,
    remainingHealth,
    stars,
    timestamp: readTimestamp(now),
  };
}

export function createGameStore(dependencies: GameStoreDependencies = {}): GameStoreApi {
  const storage = dependencies.storage ?? null;
  const now = dependencies.now ?? (() => new Date());
  const loadedGame = loadPersistentGame(storage);

  return createStore<GameStoreState>()((set, get) => ({
    player: createDefaultPlayerState(),
    currentStageId: null,
    elapsedTimeMs: 0,
    status: 'idle',
    stars: 0,
    result: null,
    progress: loadedGame.progress,
    settings: loadedGame.settings,
    persistenceStatus: loadedGame.status,

    startStage: (stageId) => {
      assertPositiveSafeInteger(stageId, 'stage id');

      set({
        player: createDefaultPlayerState(),
        currentStageId: stageId,
        elapsedTimeMs: 0,
        status: 'playing',
        stars: 0,
        result: null,
      });
    },

    setPlayerSnapshot: (position, velocity) => {
      assertVector(position, 'position');
      assertVector(velocity, 'velocity');

      if (get().status !== 'playing') {
        return;
      }

      set((state) => ({
        player: {
          ...state.player,
          position: copyVector(position),
          velocity: copyVector(velocity),
        },
      }));
    },

    setElapsedTimeMs: (elapsedTimeMs) => {
      assertNonNegativeSafeInteger(elapsedTimeMs, 'elapsed time');

      if (get().status !== 'playing') {
        return;
      }

      set({ elapsedTimeMs });
    },

    updateHealth: (delta) => {
      if (!Number.isFinite(delta)) {
        throw new RangeError('health delta must be finite.');
      }

      if (get().status !== 'playing') {
        return;
      }

      set((state) => {
        const health = applyHealthDelta(state.player.health, delta);
        const failed = isHealthDepleted(health);

        return {
          player: {
            ...state.player,
            health,
            isLanded: failed ? false : state.player.isLanded,
          },
          status: failed ? 'failed' : state.status,
          stars: failed ? 0 : state.stars,
          result: failed ? null : state.result,
        };
      });
    },

    land: (success) => {
      if (typeof success !== 'boolean') {
        throw new TypeError('landing success must be a boolean.');
      }

      const state = get();

      if (state.status === 'cleared' || state.status === 'failed') {
        return state.result;
      }

      if (state.status !== 'playing') {
        return null;
      }

      const cleared =
        success && state.currentStageId !== null && !isHealthDepleted(state.player.health);
      const stars = cleared ? calculateStars(state.player.health) : 0;
      const result =
        state.currentStageId === null
          ? null
          : createResult(
              state.currentStageId,
              state.elapsedTimeMs,
              state.player.health,
              stars,
              now,
            );
      const progress =
        cleared && result !== null
          ? mergeProgress(
              state.progress,
              result.stageId,
              result.timeMs,
              result.stars as CompletedStarRating,
            )
          : state.progress;

      set({
        player: {
          ...state.player,
          isLanded: cleared,
        },
        status: cleared ? 'cleared' : 'failed',
        stars,
        result,
        progress,
      });

      return result;
    },

    updateSettings: (patch) => {
      if (typeof patch !== 'object' || patch === null || Array.isArray(patch)) {
        throw new TypeError('settings patch must be an object.');
      }

      if (patch.showControlHints !== undefined && typeof patch.showControlHints !== 'boolean') {
        throw new TypeError('showControlHints must be a boolean.');
      }

      if (patch.showControlHints === undefined) {
        return;
      }

      set((state) => ({
        settings: {
          ...state.settings,
          showControlHints: patch.showControlHints as boolean,
        },
      }));
    },

    saveProgress: () => {
      const state = get();

      return savePersistentGame(storage, loadedGame.canWrite, state.progress, state.settings);
    },
  }));
}

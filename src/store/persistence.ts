import {
  createDefaultProgress,
  createDefaultSettings,
  type CompletedStarRating,
  type GameProgress,
  type GameSettings,
  type StageProgress,
} from '@/store/gameTypes';

export const GAME_STORAGE_KEY = 'mothProgress';
export const GAME_SCHEMA_VERSION = 1 as const;

export interface GameStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export type PersistenceLoadStatus =
  'loaded' | 'empty' | 'invalid' | 'unavailable' | 'future-version';

export type SaveProgressResult = 'saved' | 'unavailable' | 'read-only' | 'failed';

export interface LoadedPersistentGame {
  readonly progress: GameProgress;
  readonly settings: GameSettings;
  readonly status: PersistenceLoadStatus;
  readonly canWrite: boolean;
}

interface ParsedValue<T> {
  readonly value: T;
  readonly valid: boolean;
}

interface PersistedGameV1 {
  readonly schemaVersion: typeof GAME_SCHEMA_VERSION;
  readonly progress: GameProgress;
  readonly settings: GameSettings;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isPositiveSafeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
}

function isNonNegativeSafeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

function isCompletedStarRating(value: unknown): value is CompletedStarRating {
  return value === 1 || value === 2 || value === 3;
}

function parseStageProgress(value: unknown): StageProgress | null {
  if (!isRecord(value)) {
    return null;
  }

  if (
    !isPositiveSafeInteger(value.stageId) ||
    !isNonNegativeSafeInteger(value.bestTimeMs) ||
    !isCompletedStarRating(value.bestStars)
  ) {
    return null;
  }

  return {
    stageId: value.stageId,
    bestTimeMs: value.bestTimeMs,
    bestStars: value.bestStars,
  };
}

function mergeStageProgress(
  existing: StageProgress | undefined,
  incoming: StageProgress,
): StageProgress {
  if (existing === undefined) {
    return incoming;
  }

  return {
    stageId: existing.stageId,
    bestTimeMs: Math.min(existing.bestTimeMs, incoming.bestTimeMs),
    bestStars: Math.max(existing.bestStars, incoming.bestStars) as CompletedStarRating,
  };
}

function calculateTotalStars(completedStages: readonly StageProgress[]): number {
  return completedStages.reduce((total, stage) => total + stage.bestStars, 0);
}

function parseProgress(value: unknown): ParsedValue<GameProgress> {
  if (!isRecord(value) || !Array.isArray(value.completedStages)) {
    return {
      value: createDefaultProgress(),
      valid: false,
    };
  }

  const stagesById = new Map<number, StageProgress>();
  let valid = true;

  for (const candidate of value.completedStages) {
    const parsedStage = parseStageProgress(candidate);

    if (parsedStage === null) {
      valid = false;
      continue;
    }

    const existingStage = stagesById.get(parsedStage.stageId);

    if (existingStage !== undefined) {
      valid = false;
    }

    stagesById.set(parsedStage.stageId, mergeStageProgress(existingStage, parsedStage));
  }

  const completedStages = [...stagesById.values()].sort(
    (first, second) => first.stageId - second.stageId,
  );
  const totalStars = calculateTotalStars(completedStages);

  if (!isNonNegativeSafeInteger(value.totalStars) || value.totalStars !== totalStars) {
    valid = false;
  }

  return {
    value: {
      completedStages,
      totalStars,
    },
    valid,
  };
}

function parseSettings(value: unknown): ParsedValue<GameSettings> {
  if (!isRecord(value) || typeof value.showControlHints !== 'boolean') {
    return {
      value: createDefaultSettings(),
      valid: false,
    };
  }

  return {
    value: {
      showControlHints: value.showControlHints,
    },
    valid: true,
  };
}

function createDefaultLoadedGame(
  status: PersistenceLoadStatus,
  canWrite: boolean,
): LoadedPersistentGame {
  return {
    progress: createDefaultProgress(),
    settings: createDefaultSettings(),
    status,
    canWrite,
  };
}

export function loadPersistentGame(storage: GameStorage | null): LoadedPersistentGame {
  if (storage === null) {
    return createDefaultLoadedGame('unavailable', false);
  }

  let serializedGame: string | null;

  try {
    serializedGame = storage.getItem(GAME_STORAGE_KEY);
  } catch {
    return createDefaultLoadedGame('unavailable', false);
  }

  if (serializedGame === null) {
    return createDefaultLoadedGame('empty', true);
  }

  let parsedGame: unknown;

  try {
    parsedGame = JSON.parse(serializedGame) as unknown;
  } catch {
    return createDefaultLoadedGame('invalid', true);
  }

  if (!isRecord(parsedGame)) {
    return createDefaultLoadedGame('invalid', true);
  }

  if (
    typeof parsedGame.schemaVersion === 'number' &&
    parsedGame.schemaVersion > GAME_SCHEMA_VERSION
  ) {
    return createDefaultLoadedGame('future-version', false);
  }

  if (parsedGame.schemaVersion !== GAME_SCHEMA_VERSION) {
    return createDefaultLoadedGame('invalid', true);
  }

  const parsedProgress = parseProgress(parsedGame.progress);
  const parsedSettings = parseSettings(parsedGame.settings);

  return {
    progress: parsedProgress.value,
    settings: parsedSettings.value,
    status: parsedProgress.valid && parsedSettings.valid ? 'loaded' : 'invalid',
    canWrite: true,
  };
}

export function savePersistentGame(
  storage: GameStorage | null,
  canWrite: boolean,
  progress: GameProgress,
  settings: GameSettings,
): SaveProgressResult {
  if (storage === null) {
    return 'unavailable';
  }

  if (!canWrite) {
    return 'read-only';
  }

  const persistedGame: PersistedGameV1 = {
    schemaVersion: GAME_SCHEMA_VERSION,
    progress,
    settings,
  };

  try {
    const currentSerializedGame = storage.getItem(GAME_STORAGE_KEY);

    if (currentSerializedGame !== null) {
      try {
        const currentGame = JSON.parse(currentSerializedGame) as unknown;

        if (
          isRecord(currentGame) &&
          typeof currentGame.schemaVersion === 'number' &&
          currentGame.schemaVersion > GAME_SCHEMA_VERSION
        ) {
          return 'read-only';
        }
      } catch {
        // Malformed data is repairable and may be replaced with the valid v1 payload.
      }
    }

    storage.setItem(GAME_STORAGE_KEY, JSON.stringify(persistedGame));
    return 'saved';
  } catch {
    return 'failed';
  }
}

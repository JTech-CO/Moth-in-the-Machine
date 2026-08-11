import { describe, expect, it } from 'vitest';

import {
  GAME_SCHEMA_VERSION,
  GAME_STORAGE_KEY,
  loadPersistentGame,
  savePersistentGame,
  type GameStorage,
} from '@/store/persistence';

class MemoryStorage implements GameStorage {
  readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

function seedStorage(value: unknown): MemoryStorage {
  const storage = new MemoryStorage();
  storage.setItem(GAME_STORAGE_KEY, typeof value === 'string' ? value : JSON.stringify(value));
  return storage;
}

describe('loadPersistentGame', () => {
  it('returns safe defaults when storage is unavailable or empty', () => {
    expect(loadPersistentGame(null)).toEqual({
      progress: { completedStages: [], totalStars: 0 },
      settings: { showControlHints: true },
      status: 'unavailable',
      canWrite: false,
    });

    expect(loadPersistentGame(new MemoryStorage())).toEqual({
      progress: { completedStages: [], totalStars: 0 },
      settings: { showControlHints: true },
      status: 'empty',
      canWrite: true,
    });
  });

  it('loads a valid v1 payload and sorts completed stages', () => {
    const storage = seedStorage({
      schemaVersion: GAME_SCHEMA_VERSION,
      progress: {
        completedStages: [
          { stageId: 3, bestTimeMs: 3200, bestStars: 1 },
          { stageId: 1, bestTimeMs: 1500, bestStars: 3 },
        ],
        totalStars: 4,
      },
      settings: {
        showControlHints: false,
      },
    });

    expect(loadPersistentGame(storage)).toEqual({
      progress: {
        completedStages: [
          { stageId: 1, bestTimeMs: 1500, bestStars: 3 },
          { stageId: 3, bestTimeMs: 3200, bestStars: 1 },
        ],
        totalStars: 4,
      },
      settings: {
        showControlHints: false,
      },
      status: 'loaded',
      canWrite: true,
    });
  });

  it('salvages valid records, merges duplicates, and repairs derived totals', () => {
    const storage = seedStorage({
      schemaVersion: GAME_SCHEMA_VERSION,
      progress: {
        completedStages: [
          { stageId: 2, bestTimeMs: 3000, bestStars: 1 },
          { stageId: 2, bestTimeMs: 2500, bestStars: 3 },
          { stageId: 4, bestTimeMs: 5000, bestStars: 2 },
          { stageId: 0, bestTimeMs: -1, bestStars: 7 },
          null,
        ],
        totalStars: 99,
      },
      settings: {
        showControlHints: 'yes',
      },
    });

    expect(loadPersistentGame(storage)).toEqual({
      progress: {
        completedStages: [
          { stageId: 2, bestTimeMs: 2500, bestStars: 3 },
          { stageId: 4, bestTimeMs: 5000, bestStars: 2 },
        ],
        totalStars: 5,
      },
      settings: {
        showControlHints: true,
      },
      status: 'invalid',
      canWrite: true,
    });
  });

  it.each([
    '{bad json',
    'null',
    '[]',
    JSON.stringify({ schemaVersion: 0 }),
    JSON.stringify({ schemaVersion: '1' }),
    JSON.stringify({
      schemaVersion: GAME_SCHEMA_VERSION,
      progress: null,
      settings: null,
    }),
  ])('falls back without throwing for invalid persisted input %#', (serialized) => {
    const storage = seedStorage(serialized);

    expect(() => loadPersistentGame(storage)).not.toThrow();
    expect(loadPersistentGame(storage)).toMatchObject({
      progress: { completedStages: [], totalStars: 0 },
      settings: { showControlHints: true },
      status: 'invalid',
      canWrite: true,
    });
  });

  it('protects data written by a future schema version', () => {
    const storage = seedStorage({
      schemaVersion: GAME_SCHEMA_VERSION + 1,
      progress: {
        completedStages: [{ stageId: 1, bestTimeMs: 100, bestStars: 3 }],
        totalStars: 3,
      },
      settings: { showControlHints: false },
    });

    expect(loadPersistentGame(storage)).toEqual({
      progress: { completedStages: [], totalStars: 0 },
      settings: { showControlHints: true },
      status: 'future-version',
      canWrite: false,
    });
  });

  it('falls back when reading storage throws', () => {
    const storage: GameStorage = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => undefined,
    };

    expect(loadPersistentGame(storage)).toMatchObject({
      status: 'unavailable',
      canWrite: false,
    });
  });
});

describe('savePersistentGame', () => {
  const progress = {
    completedStages: [{ stageId: 1, bestTimeMs: 1200, bestStars: 3 as const }],
    totalStars: 3,
  };
  const settings = {
    showControlHints: false,
  };

  it('returns explicit outcomes for unavailable and read-only storage', () => {
    expect(savePersistentGame(null, true, progress, settings)).toBe('unavailable');

    const storage = new MemoryStorage();
    expect(savePersistentGame(storage, false, progress, settings)).toBe('read-only');
    expect(storage.getItem(GAME_STORAGE_KEY)).toBeNull();
  });

  it('serializes only the versioned durable state and repairs malformed data', () => {
    const storage = seedStorage('{malformed');

    expect(savePersistentGame(storage, true, progress, settings)).toBe('saved');
    expect(JSON.parse(storage.getItem(GAME_STORAGE_KEY)!)).toEqual({
      schemaVersion: GAME_SCHEMA_VERSION,
      progress,
      settings,
    });
  });

  it('rechecks and preserves a future-version payload before writing', () => {
    const storage = seedStorage({ schemaVersion: GAME_SCHEMA_VERSION + 1 });
    const serializedFuturePayload = storage.getItem(GAME_STORAGE_KEY);

    expect(savePersistentGame(storage, true, progress, settings)).toBe('read-only');
    expect(storage.getItem(GAME_STORAGE_KEY)).toBe(serializedFuturePayload);
  });

  it.each([
    {
      getItem: () => {
        throw new Error('read blocked');
      },
      setItem: () => undefined,
    },
    {
      getItem: () => null,
      setItem: () => {
        throw new Error('quota exceeded');
      },
    },
  ] satisfies GameStorage[])('reports storage failures without throwing', (storage) => {
    expect(() => savePersistentGame(storage, true, progress, settings)).not.toThrow();
    expect(savePersistentGame(storage, true, progress, settings)).toBe('failed');
  });
});

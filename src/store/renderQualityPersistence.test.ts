import { describe, expect, it } from 'vitest';

import { createGameStore } from '@/store/gameStore';
import {
  GAME_SCHEMA_VERSION,
  GAME_STORAGE_KEY,
  loadPersistentGame,
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

function seedStorage(settings: unknown): MemoryStorage {
  const storage = new MemoryStorage();
  storage.setItem(
    GAME_STORAGE_KEY,
    JSON.stringify({
      schemaVersion: GAME_SCHEMA_VERSION,
      progress: { completedStages: [], totalStars: 0 },
      settings,
    }),
  );
  return storage;
}

describe('render quality persistence', () => {
  it('migrates legacy v1 settings to adaptive quality without invalidating them', () => {
    const loaded = loadPersistentGame(seedStorage({ showControlHints: false }));

    expect(loaded).toMatchObject({
      settings: { showControlHints: false, renderQuality: 'auto' },
      status: 'loaded',
      canWrite: true,
    });
  });

  it('loads low-spec quality and repairs unknown quality values independently', () => {
    expect(
      loadPersistentGame(seedStorage({ showControlHints: true, renderQuality: 'low' })),
    ).toMatchObject({
      settings: { showControlHints: true, renderQuality: 'low' },
      status: 'loaded',
    });
    expect(
      loadPersistentGame(seedStorage({ showControlHints: false, renderQuality: 'ultra' })),
    ).toMatchObject({
      settings: { showControlHints: false, renderQuality: 'auto' },
      status: 'invalid',
    });
  });

  it('persists a validated low-spec setting through the game store', () => {
    const storage = new MemoryStorage();
    const store = createGameStore({ storage });

    store.getState().updateSettings({ renderQuality: 'low' });

    expect(store.getState().saveProgress()).toBe('saved');
    expect(JSON.parse(storage.getItem(GAME_STORAGE_KEY) ?? 'null')).toMatchObject({
      schemaVersion: GAME_SCHEMA_VERSION,
      settings: { showControlHints: true, renderQuality: 'low' },
    });
  });

  it('updates either setting independently and rejects unknown quality patches', () => {
    const store = createGameStore();

    store.getState().updateSettings({ renderQuality: 'low' });
    expect(store.getState().settings).toEqual({
      showControlHints: true,
      renderQuality: 'low',
    });

    store.getState().updateSettings({ showControlHints: false });
    expect(store.getState().settings).toEqual({
      showControlHints: false,
      renderQuality: 'low',
    });

    const beforeInvalidPatch = store.getState();
    expect(() => store.getState().updateSettings({ renderQuality: 'ultra' as never })).toThrow(
      TypeError,
    );
    expect(store.getState()).toBe(beforeInvalidPatch);
  });
});
